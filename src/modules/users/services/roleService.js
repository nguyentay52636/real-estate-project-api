import RoleModel from '#models/Role.js';

export function createRoleService(deps = {}) {
  const Role = deps.Role ?? RoleModel;

  async function getAllRoles() {
    return Role.find();
  }

  return { getAllRoles };
}

const roleService = createRoleService();
export default roleService;
