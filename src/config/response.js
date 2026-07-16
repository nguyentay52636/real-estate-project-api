
const responseApi = (res, code, data, message) => {
   res.status(code).json({
    message: message,
    data: data,
    date: new Date()
})
}
export { responseApi };
export default { responseApi };