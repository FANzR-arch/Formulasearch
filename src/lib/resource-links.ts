// Shared resource visibility, references and reverse Skill links; no browser or content-loader dependencies.
import type { CatalogSection, CatalogProjectItem, ResourceLinkItem } from '../data/catalog'

export const getVisibleResourceSections = (sections: CatalogSection[]): CatalogSection[] => sections
  .map((section) => section.presentation === 'resource-links'
    ? { ...section, groups: section.groups.filter((group) => group.items.length > 0) }
    : section)
  .filter((section) => section.presentation !== 'resource-links' || section.groups.length > 0)

export function validateResourceReferences(
  sections: CatalogSection[],
  skills: Pick<CatalogSection, 'id'>[],
  projects: Pick<CatalogProjectItem, 'id'>[],
  posts?: { slug: string; draft?: boolean }[],
) {
  const skillIds = new Set(skills.map((skill) => skill.id))
  const projectIds = new Set(projects.map((project) => project.id))
  const postSlugs = posts && new Set(posts.filter((post) => !post.draft).map((post) => post.slug))
  const itemIds = new Set<string>()
  for (const section of sections) {
    if (section.presentation === 'projects') {
      for (const item of section.items) {
        if (itemIds.has(item.id)) throw new Error(`Resource validation failed: duplicate item id "${item.id}".`)
        itemIds.add(item.id)
      }
    }
  }
  for (const section of sections) {
    if (section.presentation !== 'resource-links') continue
    const groupIds = new Set<string>()
    for (const group of section.groups) {
      if (groupIds.has(group.id)) throw new Error(`Resource section "${section.id}" has duplicate group id "${group.id}".`)
      groupIds.add(group.id)
      for (const item of group.items) {
        if (itemIds.has(item.id)) throw new Error(`Resource validation failed: duplicate item id "${item.id}".`)
        itemIds.add(item.id)
        const context = `Resource "${item.id}" (${section.id}/${group.id})`
        if (!item.url && !item.related?.post) throw new Error(`${context} must have a URL or related.post.`)
        if (item.related?.skill && !skillIds.has(item.related.skill)) throw new Error(`${context} references unknown Skill section "${item.related.skill}".`)
        if (item.related?.project && !projectIds.has(item.related.project)) throw new Error(`${context} references unknown project "${item.related.project}".`)
        if (item.related?.post && postSlugs && !postSlugs.has(item.related.post)) throw new Error(`${context} references unknown or draft blog post "${item.related.post}".`)
      }
    }
  }
}

export const getSkillResourceItems = (sections: CatalogSection[], skillId: string): ResourceLinkItem[] => sections
  .flatMap((section) => section.presentation === 'resource-links' ? section.groups.flatMap((group) => group.items) : [])
  .filter((item) => item.related?.skill === skillId)
