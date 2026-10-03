// Exercise the shared resource helpers and validate published catalog references without changing content.
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'yaml'
import {
  getVisibleResourceSections,
  getSkillResourceItems,
  validateResourceReferences,
} from '../src/lib/resource-links.ts'

const projectRoot = path.resolve(import.meta.dirname, '..')
const copy = (zh, en = zh) => ({ zh, en })
const presentations = ['skill-gallery', 'skill-type', 'skill-project', 'list']
const skills = presentations.map((presentation) => ({ id: `fixture-${presentation}`, presentation }))
const projects = [{ id: 'fixture-project' }, { id: 'fixture-course' }]
const posts = [{ slug: 'published-post', draft: false }, { slug: 'draft-post', draft: true }]

const createItem = (id, related = {}) => ({
  id,
  ...copy(`Resource ${id}`),
  description: copy(`Description ${id}`),
  source: 'own',
  related,
})
const createGroup = (id, items) => ({ id, title: copy(id), icon: 'resources-prompts', items })
const createSection = (id, groups) => ({
  id,
  label: '01',
  title: copy(id),
  description: copy(id),
  presentation: 'resource-links',
  groups,
})
const courseSection = { id: 'courses', presentation: 'projects', items: [{ id: 'fixture-course' }] }
const linkedItems = skills.map((skill, index) => createItem(`linked-${index}`, {
  skill: skill.id,
  post: 'published-post',
  project: 'fixture-project',
}))
const urlItem = { ...createItem('external-tool'), url: 'https://example.com/', source: 'external' }
const populatedSection = createSection('aigc', [
  createGroup('prompts', linkedItems),
  createGroup('tools', [urlItem]),
  createGroup('empty', []),
])
const fixture = [courseSection, populatedSection]
const validate = (sections) => validateResourceReferences(sections, skills, projects, posts)
let assertions = 0

assert.doesNotThrow(() => validate(fixture), 'valid URL-only and post-only resources should pass')
assertions++

function expectFailure(label, mutate, pattern) {
  const data = structuredClone(fixture)
  mutate(data)
  assert.throws(() => validate(data), pattern, label)
  assertions++
}

expectFailure('unknown Skill section', (data) => {
  data[1].groups[0].items[0].related.skill = 'missing-skill'
}, /Resource "linked-0" \(aigc\/prompts\) references unknown Skill section "missing-skill"/)
expectFailure('unknown project', (data) => {
  data[1].groups[0].items[0].related.project = 'missing-project'
}, /references unknown project "missing-project"/)
expectFailure('unknown blog post', (data) => {
  data[1].groups[0].items[0].related.post = 'missing-post'
}, /references unknown or draft blog post "missing-post"/)
expectFailure('draft blog post', (data) => {
  data[1].groups[0].items[0].related.post = 'draft-post'
}, /references unknown or draft blog post "draft-post"/)
expectFailure('missing primary link', (data) => {
  delete data[1].groups[0].items[0].related.post
}, /must have a URL or related\.post/)
expectFailure('duplicate item across resource sections', (data) => {
  data.push(createSection('tools', [createGroup('icons', [structuredClone(urlItem)])]))
}, /duplicate item id "external-tool"/)
expectFailure('duplicate item across groups', (data) => {
  data[1].groups[1].items.push(structuredClone(data[1].groups[0].items[0]))
}, /duplicate item id "linked-0"/)
expectFailure('duplicate item shared with a resource course', (data) => {
  data[1].groups[0].items[0].id = 'fixture-course'
}, /duplicate item id "fixture-course"/)
expectFailure('duplicate group within a resource section', (data) => {
  data[1].groups.push(createGroup('prompts', []))
}, /Resource section "aigc" has duplicate group id "prompts"/)

function deepFreeze(value) {
  if (!value || typeof value !== 'object') return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

const visibilityFixture = [
  courseSection,
  populatedSection,
  createSection('no-groups', []),
  createSection('all-empty', [createGroup('workflows', []), createGroup('materials', [])]),
]
const original = structuredClone(visibilityFixture)
deepFreeze(visibilityFixture)
const visible = getVisibleResourceSections(visibilityFixture)
assert.deepEqual(visible.map((section) => section.id), ['courses', 'aigc'])
assert.deepEqual(visible[1].groups.map((group) => group.id), ['prompts', 'tools'])
assert.strictEqual(visible[0], courseSection, 'other resource presentations should be preserved')
assert.deepEqual(visibilityFixture, original, 'visibility filtering must not change original data')
assertions += 4

for (const [index, skill] of skills.entries()) {
  const resources = getSkillResourceItems(visible, skill.id)
  assert.deepEqual(resources.map((item) => item.id), [`linked-${index}`], `${skill.presentation} should support reverse links`)
  assert.strictEqual(resources[0], linkedItems[index], 'reverse links should retain localized item data')
  assertions += 2
}
assert.deepEqual(getSkillResourceItems(visible, 'unreferenced-skill'), [])
assertions++

const catalog = JSON.parse(await readFile(path.join(projectRoot, 'content/site/catalog.json'), 'utf8'))
const blogRoot = path.join(projectRoot, 'content/blog')
const blogDirectories = (await readdir(blogRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory())
const publishedPosts = await Promise.all(blogDirectories.map(async (directory) => {
  const filename = path.join(blogRoot, directory.name, 'index.md')
  const source = await readFile(filename, 'utf8')
  const frontmatter = source.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  assert.ok(frontmatter, `${filename} must have frontmatter`)
  const data = parse(frontmatter[1])
  return { slug: data.slug, draft: data.draft }
}))
const projectItems = [...catalog.projects, ...catalog.resources]
  .flatMap((section) => section.presentation === 'projects' ? section.items : section.presentation === 'list' ? section.projects ?? [] : [])
assert.doesNotThrow(() => validateResourceReferences(catalog.resources, catalog.skills, projectItems, publishedPosts), 'current catalog references should pass')
assertions++

const originalResources = structuredClone(catalog.resources)
const actualFixture = structuredClone(catalog.resources)
const actualSkillItem = actualFixture
  .flatMap((section) => section.presentation === 'resource-links' ? section.groups.flatMap((group) => group.items) : [])
  .find((item) => item.related?.skill)
if (actualSkillItem) {
  actualSkillItem.related.skill = 'nonexistent-resource-test-skill'
  assert.throws(
    () => validateResourceReferences(actualFixture, catalog.skills, projectItems, publishedPosts),
    /references unknown Skill section "nonexistent-resource-test-skill"/,
    'an invalid Skill reference in a copy of the real catalog must fail',
  )
  assertions++
}
assert.deepEqual(catalog.resources, originalResources, 'validation fixtures must not change live resources')
assertions++

console.log(`Resource links tests passed: ${assertions} assertions; live catalog references, invalid IDs, draft posts, unique items, visibility, and all four Skill presentations.`)
