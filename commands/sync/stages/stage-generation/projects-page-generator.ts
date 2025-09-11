import { Project } from '../../classes'
import { writeTextFile } from '../../lib/file-operations'
import * as text from '../../lib/text'

type ProjectData = {
  name: string
  type: 'Chain' | 'Project' | 'ETF' | 'Treasury'
  metrics: number
  categories: string[]
  slug: string
}

const getProjectsPageTemplate = (projects: ProjectData[]) => `---
title: 'Projects Supported'
description: 'All chains and projects currently supported by the Blockworks Data API'
icon: list
---

import { useState, useMemo } from 'react'

export const ProjectsTable = () => {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const projects = ${JSON.stringify(projects, null, 2)}

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = search === '' ||
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.categories.some(cat => cat.toLowerCase().includes(search.toLowerCase()))
      const matchesType = typeFilter === 'all' || project.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [search, typeFilter])

  const stats = useMemo(() => ({
    chains: projects.filter(p => p.type === 'Chain').length,
    projects: projects.filter(p => p.type === 'Project').length,
    etfs: projects.filter(p => p.type === 'ETF').length,
    treasuries: projects.filter(p => p.type === 'Treasury').length,
    total: projects.length
  }), [])

  return (
    <div>
      <div className="mb-6 grid grid-cols-5 gap-4">
        <button 
          onClick={() => setTypeFilter('Chain')}
          className={\`text-center p-3 rounded-lg transition-all cursor-pointer hover:scale-105 \${
            typeFilter === 'Chain' 
              ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500 dark:ring-blue-400' 
              : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
          }\`}
        >
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.chains}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Chains</div>
        </button>
        <button 
          onClick={() => setTypeFilter('Project')}
          className={\`text-center p-3 rounded-lg transition-all cursor-pointer hover:scale-105 \${
            typeFilter === 'Project' 
              ? 'bg-green-100 dark:bg-green-900 ring-2 ring-green-500 dark:ring-green-400' 
              : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
          }\`}
        >
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.projects}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Projects</div>
        </button>
        <button 
          onClick={() => setTypeFilter('ETF')}
          className={\`text-center p-3 rounded-lg transition-all cursor-pointer hover:scale-105 \${
            typeFilter === 'ETF' 
              ? 'bg-purple-100 dark:bg-purple-900 ring-2 ring-purple-500 dark:ring-purple-400' 
              : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
          }\`}
        >
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.etfs}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">ETFs</div>
        </button>
        <button 
          onClick={() => setTypeFilter('Treasury')}
          className={\`text-center p-3 rounded-lg transition-all cursor-pointer hover:scale-105 \${
            typeFilter === 'Treasury' 
              ? 'bg-orange-100 dark:bg-orange-900 ring-2 ring-orange-500 dark:ring-orange-400' 
              : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
          }\`}
        >
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.treasuries}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Treasuries</div>
        </button>
        <button 
          onClick={() => setTypeFilter('all')}
          className={\`text-center p-3 rounded-lg transition-all cursor-pointer hover:scale-105 \${
            typeFilter === 'all' 
              ? 'bg-gray-200 dark:bg-gray-700 ring-2 ring-gray-500 dark:ring-gray-400' 
              : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
          }\`}
        >
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
        </button>
      </div>

      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search projects or categories..."
          className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="Chain">Chains</option>
          <option value="Project">Projects</option>
          <option value="ETF">ETFs</option>
          <option value="Treasury">Treasuries</option>
        </select>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Showing {filteredProjects.length} of {projects.length} projects
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-2 px-3">Project</th>
              <th className="text-left py-2 px-3">Type</th>
              <th className="text-center py-2 px-3">Metrics</th>
              <th className="text-left py-2 px-3">Categories</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((project, idx) => (
              <tr key={idx} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="py-2 px-3">
                  <a href={\`/api-reference/metrics/\${project.slug}\`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    {project.name}
                  </a>
                </td>
                <td className="py-2 px-3">
                  <span className={\`px-2 py-1 text-xs rounded-full \${
                    project.type === 'Chain' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                    project.type === 'ETF' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                    project.type === 'Treasury' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                    'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  }\`}>
                    {project.type}
                  </span>
                </td>
                <td className="text-center py-2 px-3">{project.metrics}</td>
                <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">
                  {project.categories.join(', ') || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProjects.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No projects found matching your search
          </div>
        )}
      </div>
    </div>
  )
}

<ProjectsTable />

## About This Page

This page is automatically generated and contains all ${projects.length} projects currently supported by the Blockworks Data API.

- **Chains**: Blockchain networks with transaction and activity metrics
- **Projects**: DeFi protocols, applications, and platforms
- **ETFs**: Exchange-traded funds with price and flow metrics
- **Treasuries**: Corporate and protocol treasury holdings
`

export const generateProjectsPage = async (projects: Project[]): Promise<void> => {
  text.header('📋 Generating projects supported page...')

  // Transform projects into simplified data structure
  const projectData: ProjectData[] = projects
    .map(project => ({
      name: project.title,
      type: project.type === 'chain' ? 'Chain' :
            project.type === 'etf' ? 'ETF' :
            project.type === 'treasury' ? 'Treasury' : 'Project' as const,
      metrics: project.metrics.length,
      categories: [...new Set(project.metrics.map(m => m.category))].filter(Boolean).sort(),
      slug: project.slug
    }))
    .sort((a, b) => {
      // Sort by type (Chains first, then Projects, ETFs, Treasuries)
      const typeOrder: Record<string, number> = { 'Chain': 0, 'Project': 1, 'ETF': 2, 'Treasury': 3 }
      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type]! - typeOrder[b.type]!
      }
      // Then alphabetically by name
      return a.name.localeCompare(b.name)
    }) as ProjectData[]

  const content = getProjectsPageTemplate(projectData)
  await writeTextFile('./projects-supported.mdx', content)

  text.detail(`Generated projects page with ${projects.length} projects`)
}