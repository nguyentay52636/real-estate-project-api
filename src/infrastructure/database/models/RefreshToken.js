import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
    token : {type :String , required : true},
    userId : {type : mongoose.Schema.Types.ObjectId, ref : 'nguoiDung',required:true},
    createAt:{ type : Date , default : Date.now,expires:'365d'}, // tự xóa sau 1 nămm
})

refreshTokenSchema.index({ token: 1 }, { unique: true });
refreshTokenSchema.index({ userId: 1 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;

