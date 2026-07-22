import RoleModel from '#models/Role.js';
import { cacheGetOrSet, cacheDel } from '#infra/cache/redisCache.js';
import { maybeLean } from '#shared/utils/queryHelpers.js';

const ROLES_CACHE_KEY = 'roles:all';
const ROLES_TTL = Number(process.env.CACHE_TTL_ROLES || 3600);

export function createRoleService(deps = {}) {
  const Role = deps.Role ?? RoleModel;

  async function getAllRoles() {
    return cacheGetOrSet(ROLES_CACHE_KEY, ROLES_TTL, () => maybeLean(Role.find()));
  }

  async function invalidateRolesCache() {
    await cacheDel(ROLES_CACHE_KEY);
  }

  return { getAllRoles, invalidateRolesCache };
}

const roleService = createRoleService();
export default roleService;
