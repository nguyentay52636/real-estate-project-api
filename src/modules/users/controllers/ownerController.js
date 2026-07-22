import ownerService from '#modules/users/services/ownerService.js';
import { responseApi } from '#config/response.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const getOwners = asyncHandler(async (req, res) => {
  const result = await ownerService.getOwners(req.query);
  return responseApi(res, 200, result, 'Get owners successfully');
});

const getOwnerById = asyncHandler(async (req, res) => {
  const owner = await ownerService.getOwnerById(req.params.id);
  return responseApi(res, 200, owner, 'Get owner by id successfully');
});

const createOwner = asyncHandler(async (req, res) => {
  const owner = await ownerService.createOwner(req.body);
  return responseApi(res, 201, owner, 'Create owner successfully');
});

const updateOwner = asyncHandler(async (req, res) => {
  const owner = await ownerService.updateOwner(req.params.id, req.body);
  return responseApi(res, 200, owner, 'Update owner successfully');
});

const deleteOwner = asyncHandler(async (req, res) => {
  const owner = await ownerService.deleteOwner(req.params.id);
  return responseApi(res, 200, owner, 'Delete owner successfully');
});

export { getOwners, getOwnerById, createOwner, updateOwner, deleteOwner };
export default { getOwners, getOwnerById, createOwner, updateOwner, deleteOwner };
