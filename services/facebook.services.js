import User from '../models/User.js';
import VaiTro from '../models/Role.js';
import KhachHang from '../models/Customer.js';
import { facebookUserValidation } from '../middleware/authValidation.js';

export const facebookCallback = async function (accessToken, refreshToken, profile, done) {
    try {
        console.log('🔍 Facebook profile received:', JSON.stringify(profile, null, 2));
        console.log('🔍 Access Token received:', accessToken ? 'Yes' : 'No');
        console.log('🔍 App Mode:', process.env.NODE_ENV || 'development');
        
        // Kiểm tra profile data có hợp lệ không
        if (!profile || !profile.id) {
            console.error('❌ Invalid Facebook profile data');
            console.error('❌ This might indicate:');
            console.error('   - Facebook App is in Development Mode');
            console.error('   - User is not a tester/developer');
            console.error('   - App Review required for public access');
            return done(new Error('Invalid Facebook profile data - App may be in Development Mode'), null);
        }
        
        // Log thông tin permissions
        console.log('🔍 Facebook profile emails:', profile.emails);
        console.log('🔍 Facebook profile email value:', profile.emails?.[0]?.value);
        
        // Kiểm tra user có email không (indicator của permissions)
        if (!profile.emails || !profile.emails[0]) {
            console.warn('⚠️ No email permission granted');
            console.warn('⚠️ This might indicate:');
            console.warn('   - Email permission not approved in App Review');
            console.warn('   - User denied email permission');
            console.warn('   - App in Development Mode with limited permissions');
        }
        
        // Tìm user existing
        let existingUser = await User.findOne({ 
            $or: [
                { facebookId: profile.id },
                { email: profile.emails?.[0]?.value }
            ]
        }).populate('vaiTro');

        if (existingUser) {
            console.log('✅ Existing user found:', existingUser.tenDangNhap);
            
            // Update Facebook ID nếu chưa có
            if (!existingUser.facebookId) {
                existingUser.facebookId = profile.id;
                await existingUser.save();
                console.log('✅ Updated existing user with Facebook ID');
            }
            
            // Cập nhật thông tin từ Facebook
            if (existingUser.facebookId === profile.id) {
                try {
                    await existingUser.updateFromFacebook(profile);
                    console.log('✅ Updated user info from Facebook');
                } catch (updateError) {
                    console.warn('⚠️ Warning: Could not update user info from Facebook:', updateError.message);
                    // Continue with login even if update fails
                }
            }
            
            console.log('✅ Existing user logged in successfully:', existingUser.tenDangNhap);
            return done(null, existingUser);
        }

        // Tạo user mới
        console.log('🔄 Creating new user from Facebook profile...');
        
        let vaiTro = await VaiTro.findOne({ ten: 'nguoi_thue' });
        if (!vaiTro) {
            vaiTro = await VaiTro.create({ 
                ten: 'nguoi_thue', 
                moTa: 'Vai trò người thuê'
            });
            console.log('✅ Created new role: nguoi_thue');
        }

        let userEmail;
        if (profile.emails && profile.emails[0] && profile.emails[0].value) {
            // Facebook cung cấp email thật
            userEmail = profile.emails[0].value;
            console.log('✅ Using Facebook provided email:', userEmail);
        } else {
            // Fallback email - thường xảy ra khi app không có email permission
            userEmail = `fb${profile.id}@example.com`;
            console.log('⚠️ Generated fallback email:', userEmail);
            console.log('⚠️ Consider requesting email permission in Facebook App Review');
        }
        
        let tenDangNhap = `fb_${profile.id}`;
        
        // Kiểm tra và tạo username unique nếu bị trùng
        let usernameExists = await User.findOne({ tenDangNhap: tenDangNhap });
        let counter = 1;
        while (usernameExists) {
            tenDangNhap = `fb_${profile.id}_${counter}`;
            usernameExists = await User.findOne({ tenDangNhap: tenDangNhap });
            counter++;
            // Prevent infinite loop
            if (counter > 1000) {
                throw new Error('Unable to generate unique username');
            }
        }

        // Kiểm tra email unique
        let emailToUse = userEmail;
        let emailExists = await User.findOne({ email: emailToUse });
        let emailCounter = 1;
        while (emailExists) {
            if (userEmail.includes('@example.com')) {
                emailToUse = `fb${profile.id}_${emailCounter}@example.com`;
            } else {
                // Nếu email thật bị trùng, tạo variant
                const [localPart, domain] = userEmail.split('@');
                emailToUse = `${localPart}_fb${profile.id}_${emailCounter}@${domain}`;
            }
            emailExists = await User.findOne({ email: emailToUse });
            emailCounter++;
            // Prevent infinite loop
            if (emailCounter > 1000) {
                throw new Error('Unable to generate unique email');
            }
        }

        // Prepare user data để validate
        const userData = {
            ten: profile.displayName || `Facebook User ${profile.id}`,
            email: emailToUse,
            tenDangNhap: tenDangNhap,
            matKhau: 'facebook_login_no_password',
            facebookId: profile.id,
            vaiTro: vaiTro._id.toString(),
            anhDaiDien: profile.photos?.[0]?.value || '',
            trangThai: 'hoat_dong'
        };

        console.log('🔍 User data to validate:', {
            ...userData,
            matKhau: '[HIDDEN]'
        });

        // Validate data trước khi tạo user
        const { error } = facebookUserValidation(userData);
        if (error) {
            console.error('❌ Facebook user validation error:', error.details[0].message);
            console.error('❌ Validation failed for data:', {
                ...userData,
                matKhau: '[HIDDEN]'
            });
            return done(new Error(`Validation error: ${error.details[0].message}`), null);
        }

        const newUser = await User.create({
            ten: userData.ten,
            email: userData.email,
            tenDangNhap: userData.tenDangNhap,
            matKhau: userData.matKhau,
            facebookId: userData.facebookId,
            vaiTro: vaiTro._id,
            anhDaiDien: userData.anhDaiDien,
            trangThai: userData.trangThai
        });

        // Tạo khách hàng tương ứng
        await KhachHang.create({
            nguoiDungId: newUser._id,
        });

        const userWithRole = await User.findById(newUser._id).populate('vaiTro');
        console.log('✅ New Facebook user created successfully:', userWithRole.tenDangNhap);
        
        return done(null, userWithRole);

    } catch (error) {
        console.error('❌ Facebook login error:', error);
        
        // Enhanced error messages để dễ debug
        if (error.code === 11000) {
            if (error.keyPattern?.email) {
                console.error('❌ Duplicate email error - Email đã được sử dụng');
                return done(new Error('Email đã được sử dụng'), null);
            }
            if (error.keyPattern?.tenDangNhap) {
                console.error('❌ Duplicate username error - Tên đăng nhập đã được sử dụng');
                return done(new Error('Tên đăng nhập đã được sử dụng'), null);
            }
            if (error.keyPattern?.facebookId) {
                console.error('❌ Duplicate Facebook ID error - Tài khoản Facebook đã được liên kết');
                return done(new Error('Tài khoản Facebook đã được liên kết'), null);
            }
        }
        
        // Thêm context cho development mode errors
        if (error.message.includes('Invalid Facebook profile data')) {
            console.error('❌ Development Mode Issue:');
            console.error('   1. Check if Facebook App is in Development Mode');
            console.error('   2. Add users as Testers in Facebook App Dashboard');
            console.error('   3. Or submit App Review to go Live');
            console.error('   4. App ID:', process.env.FACEBOOK_APP_ID);
        }
        
        return done(error, null);
    }
};
