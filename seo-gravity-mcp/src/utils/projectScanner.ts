import * as path from 'path';
import {
  ProjectFrameworkInfo,
  DiscoveredRoute,
  RouteSourceMapping
} from '../types/findings.js';
import { defaultAdapterRegistry } from '../adapters/adapterRegistry.js';
import { FrameworkAdapter } from '../adapters/types.js';

export function getProjectAdapter(projectDir: string): FrameworkAdapter {
  const resolvedDir = path.resolve(projectDir);
  return defaultAdapterRegistry.getAdapterForProject(resolvedDir);
}

export function detectFramework(projectDir: string): ProjectFrameworkInfo {
  const resolvedDir = path.resolve(projectDir);
  const adapter = defaultAdapterRegistry.getAdapterForProject(resolvedDir);
  return adapter.getProjectInfo(resolvedDir);
}

export function discoverRoutes(projectDir: string, frameworkInfo?: ProjectFrameworkInfo): DiscoveredRoute[] {
  const resolvedDir = path.resolve(projectDir);
  const adapter = frameworkInfo?.framework
    ? (defaultAdapterRegistry.getAdapterById(frameworkInfo.framework) || defaultAdapterRegistry.getAdapterForProject(resolvedDir))
    : defaultAdapterRegistry.getAdapterForProject(resolvedDir);
  return adapter.discoverRoutes(resolvedDir);
}

export function mapUrlToRouteSource(
  targetUrl: string,
  discoveredRoutes: DiscoveredRoute[],
  projectDir = '.'
): RouteSourceMapping {
  const resolvedDir = path.resolve(projectDir);
  const adapter = defaultAdapterRegistry.getAdapterForProject(resolvedDir);
  return adapter.mapRouteToSource(targetUrl, discoveredRoutes);
}
