import roleService from '#modules/users/services/roleService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const getAllRoles = asyncHandler(async (req, res) => {
  const roles = await roleService.getAllRoles();
  return res.status(200).json(roles);
});

export { getAllRoles };
export default { getAllRoles };
