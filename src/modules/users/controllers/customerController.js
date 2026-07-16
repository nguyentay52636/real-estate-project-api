import customerService from '#modules/users/services/customerService.js';
import { asyncHandler } from '#shared/http/asyncHandler.js';

const getCustomers = asyncHandler(async (req, res) => {
  const customers = await customerService.getCustomers();
  return res.status(200).json({ message: 'Get all customers successfully', customers });
});

const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(req.params.id);
  return res.status(200).json({ message: 'Get customer by id successfully', customer });
});

const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.body);
  return res.status(200).json({ message: 'Create customer successfully', customer });
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  return res.status(200).json({ message: 'Update customer successfully', customer });
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.deleteCustomer(req.params.id);
  return res.status(200).json({ message: 'Delete customer successfully', customer });
});

export { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };
export default { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };
