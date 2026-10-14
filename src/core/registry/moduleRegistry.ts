import React from 'react';
import { UserRole } from '../../types';

export interface ModuleWidget {
  id: string;
  title: string;
  component: React.ComponentType<{ role: UserRole }>;
  minRole?: UserRole[];
  priority: number;
}

export interface ModuleConfig {
  id: string;
  name: string;
  shortName: string;
  description: string;
  iconName: string;
  path: string;
  badgeCount?: number;
  allowedRoles?: UserRole[];
  isEnabled: boolean;
  order: number;
  widgets?: ModuleWidget[];
}

class ModuleRegistry {
  private modules: Map<string, ModuleConfig> = new Map();

  register(module: ModuleConfig) {
    this.modules.set(module.id, module);
  }

  getModules(): ModuleConfig[] {
    return Array.from(this.modules.values())
      .filter((m) => m.isEnabled)
      .sort((a, b) => a.order - b.order);
  }

  getModule(id: string): ModuleConfig | undefined {
    return this.modules.get(id);
  }

  getAllowedModules(role: UserRole): ModuleConfig[] {
    return this.getModules().filter((m) => {
      if (!m.allowedRoles || m.allowedRoles.length === 0) return true;
      return m.allowedRoles.includes(role);
    });
  }

  getWidgetsForRole(role: UserRole): ModuleWidget[] {
    const widgets: ModuleWidget[] = [];
    this.getModules().forEach((mod) => {
      if (!mod.allowedRoles || mod.allowedRoles.includes(role)) {
        if (mod.widgets) {
          mod.widgets.forEach((w) => {
            if (!w.minRole || w.minRole.includes(role)) {
              widgets.push(w);
            }
          });
        }
      }
    });
    return widgets.sort((a, b) => a.priority - b.priority);
  }
}

export const moduleRegistry = new ModuleRegistry();
