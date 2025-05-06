// // index.js
// import express from 'express';
// import cors from 'cors';
// import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken';
// import { pool } from './db.js';
// import multer from 'multer';
// import dotenv from 'dotenv';
// import path from 'path';

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// // مساعدة لإصدار JWT
// function generateToken(user) {
//   return jwt.sign(
//     { userId: user.UserID, role: user.role, email: user.email },
//     process.env.JWT_SECRET,
//     { expiresIn: '4h' }
//   );
// }

// // 1. تسجيل الدخول
// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;
//   console.log('[POST /login] body:', req.body);

//   if (!email || !password) {
//     console.warn('[POST /login] Missing email or password');
//     return res.status(400).json({ error: 'Email and password are required' });
//   }

//   try {
//     const [rows] = await pool.query(
//       // استخدم اسم الجدول الصحيح `user`
//       'SELECT UserID, email, password, role FROM `user` WHERE email = ?',
//       [email]
//     );
//     console.log('[POST /login] DB rows:', rows);

//     if (rows.length === 0) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }
//     const user = rows[0];

//     // مؤقتًا للمزيد من التشخيص:
//     console.log('[POST /login] Stored hash:', user.password);
//     // في حال لديك hash حقيقي استخدم bcrypt.compare:
//     // const match = await bcrypt.compare(password, user.password);
//     const match = (password === user.password);
//     console.log('[POST /login] Password match:', match);

//     if (!match) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     const token = generateToken(user);
//     return res.json({
//       message: 'Login successful',
//       token,
//       user: { userId: user.UserID, role: user.role, email: user.email }
//     });
//   } catch (err) {
//     console.error('[/login] Error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });


// // 2. طلب رابط إعادة تعيين كلمة المرور
// app.post('/forgot-password', async (req, res) => {
//   const { email } = req.body;
//   if (!email) {
//     return res.status(400).json({ error: 'Email is required' });
//   }
//   try {
//     const [rows] = await pool.query(
//       // استخدم اسم الجدول الصحيح `user`
//       'SELECT UserID FROM `user` WHERE email = ?',
//       [email]
//     );
//     if (rows.length === 0) {
//       return res.status(404).json({ error: 'Email not found' });
//     }
//     const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
//     console.log(`Password reset link: https://yourdomain.com/reset-password?token=${resetToken}`);
//     return res.json({ message: 'Reset link sent to your email (simulated)' });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // 3. إعادة ضبط كلمة المرور فعلياً
// app.post('/reset-password', async (req, res) => {
//   const { token, newPassword } = req.body;
//   if (!token || !newPassword) {
//     return res.status(400).json({ error: 'Token and new password are required' });
//   }
//   try {
//     const payload = jwt.verify(token, process.env.JWT_SECRET);
//     const hashed = await bcrypt.hash(newPassword, 10);
//     await pool.query(
//       // استخدم اسم الجدول الصحيح `user`
//       'UPDATE `user` SET password = ? WHERE email = ?',
//       [hashed, payload.email]
//     );
//     return res.json({ message: 'Password has been reset' });
//   } catch (err) {
//     console.error(err);
//     return res.status(400).json({ error: 'Invalid or expired token' });
//   }
// });

// // Middleware للتحقق من JWT
// function authMiddleware(req, res, next) {
//   const auth = req.headers.authorization;
//   if (!auth?.startsWith('Bearer ')) {
//     return res.status(401).json({ error: 'Unauthorized' });
//   }
//   const token = auth.split(' ')[1];
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     return next();
//   } catch {
//     return res.status(401).json({ error: 'Invalid token' });
//   }
// }

// // مثال على روت محمي: جلب جدول المحاضرات للمستخدم الحالي
// app.get('/my-schedule', authMiddleware, async (req, res) => {
//   try {
//     const [rows] = await pool.query(
//       `SELECT
//          ls.ScheduleID,
//          ls.UserID,
//          ls.SubjectID,
//          s.Name AS SubjectName,
//          ls.DayOfWeek,
//          ls.StartTime,
//          ls.EndTime
//        FROM lecture_schedule AS ls
//        JOIN subject AS s
//          ON ls.SubjectID = s.SubjectID
//        WHERE ls.UserID = ?`,
//       [req.user.userId]
//     );
//     return res.json(rows);
//   } catch (err) {
//     console.error('[/my-schedule] Error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // مجلّد حفظ الملفات المرفوعة
// const upload = multer({ dest: 'uploads/' });

// // 4. جلب قائمة الشرائح لمقرر معين
// //    GET /slides?subjectId=123
// app.get('/slides', authMiddleware, async (req, res) => {
//   const subjectId = req.query.subjectId;
//   if (!subjectId) {
//     return res.status(400).json({ error: 'subjectId query parameter is required' });
//   }
//   try {
//     const [rows] = await pool.query(
//       `SELECT
//          SlideID,
//          Title,
//          Description,
//          file_path,
//          uploaded_at,
//          SubjectID
//        FROM slide
//        WHERE SubjectID = ?`,
//       [subjectId]
//     );
//     return res.json(rows);
//   } catch (err) {
//     console.error('[/slides] Error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });


// // 5. إضافة شريحة جديدة (ملف أو محتوى) لمقرر
// //    POST /subjects/:subjectId/materials
// //    حقل 'file' هو الملف المُرفوع، و 'title' و 'description' في body
// app.post(
//   '/subjects/:subjectId/materials',
//   authMiddleware,
//   upload.single('file'),
//   async (req, res) => {
//     const { subjectId } = req.params;
//     const { title, description } = req.body;
//     const file = req.file;

//     if (!title) {
//       return res.status(400).json({ error: 'Title is required' });
//     }

//     const contentPath = file ? file.path : null;

//     try {
//       await pool.query(
//         `INSERT INTO slide 
//            (Title, Description, Content, file_path, SubjectID) 
//          VALUES (?, ?, ?, ?, ?)`,
//         [
//           title,
//           description || null,
//           description || '',
//           contentPath,
//           subjectId
//         ]
//       );
//       return res.json({ message: 'Slide added successfully' });
//     } catch (err) {
//       console.error('[/subjects/:subjectId/materials] Error:', err);
//       return res.status(500).json({ error: 'Internal server error' });
//     }
//   }
// );

// // 6. جلب قائمة المواد (Subjects) المخصصة للمحاضر الحالي
// //    GET /my-subjects
// app.get('/my-subjects', authMiddleware, async (req, res) => {
//   try {
//     const [rows] = await pool.query(
//       `SELECT DISTINCT
//          s.SubjectID AS SubjectID,
//          s.Name      AS Name
//        FROM lecture_schedule AS ls
//        JOIN subject           AS s
//          ON ls.SubjectID = s.SubjectID
//        WHERE ls.UserID = ?`,
//       [req.user.userId]
//     );
//     return res.json(rows);
//   } catch (err) {
//     console.error('[/my-subjects] Error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // بعد تعريف `upload = multer({ dest: 'uploads/' })`
// app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () =>
//   console.log(`Auth API running on http://localhost:${PORT}`)
// );


// import express from 'express';
// import cors from 'cors';
// import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken';
// import { pool } from './db.js';
// import multer from 'multer';
// import dotenv from 'dotenv';
// import path from 'path';

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// // 0. Serve uploads/ as static so any GET /uploads/<file> returns the raw file
// app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// // Helper to sign JWTs
// function generateToken(user) {
//   return jwt.sign(
//     { userId: user.UserID, role: user.role, email: user.email },
//     process.env.JWT_SECRET,
//     { expiresIn: '4h' }
//   );
// }

// // 1. Login
// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;
//   if (!email || !password) {
//     return res.status(400).json({ error: 'Email and password are required' });
//   }
//   try {
//     const [rows] = await pool.query(
//       'SELECT UserID, email, password, role FROM `user` WHERE email = ?',
//       [email]
//     );
//     if (rows.length === 0) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }
//     const user = rows[0];
//     const match = (password === user.password); // replace with bcrypt.compare in prod
//     if (!match) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }
//     const token = generateToken(user);
//     return res.json({
//       message: 'Login successful',
//       token,
//       user: { userId: user.UserID, role: user.role, email: user.email }
//     });
//   } catch (err) {
//     console.error('[/login] Error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // 2. Request password-reset link
// app.post('/forgot-password', async (req, res) => {
//   const { email } = req.body;
//   if (!email) {
//     return res.status(400).json({ error: 'Email is required' });
//   }
//   try {
//     const [rows] = await pool.query(
//       'SELECT UserID FROM `user` WHERE email = ?',
//       [email]
//     );
//     if (rows.length === 0) {
//       return res.status(404).json({ error: 'Email not found' });
//     }
//     const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
//     console.log(`Password reset link: https://yourdomain.com/reset-password?token=${resetToken}`);
//     return res.json({ message: 'Reset link sent to your email (simulated)' });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // 3. Actually reset password
// app.post('/reset-password', async (req, res) => {
//   const { token, newPassword } = req.body;
//   if (!token || !newPassword) {
//     return res.status(400).json({ error: 'Token and new password are required' });
//   }
//   try {
//     const payload = jwt.verify(token, process.env.JWT_SECRET);
//     const hashed = await bcrypt.hash(newPassword, 10);
//     await pool.query(
//       'UPDATE `user` SET password = ? WHERE email = ?',
//       [hashed, payload.email]
//     );
//     return res.json({ message: 'Password has been reset' });
//   } catch (err) {
//     console.error(err);
//     return res.status(400).json({ error: 'Invalid or expired token' });
//   }
// });

// // JWT-check middleware
// function authMiddleware(req, res, next) {
//   const auth = req.headers.authorization;
//   if (!auth?.startsWith('Bearer ')) {
//     return res.status(401).json({ error: 'Unauthorized' });
//   }
//   const token = auth.split(' ')[1];
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     return next();
//   } catch {
//     return res.status(401).json({ error: 'Invalid token' });
//   }
// }

// // 4. My schedule
// app.get('/my-schedule', authMiddleware, async (req, res) => {
//   try {
//     const [rows] = await pool.query(
//       `SELECT
//          ls.ScheduleID,
//          ls.UserID,
//          ls.SubjectID,
//          s.Name AS SubjectName,
//          ls.DayOfWeek,
//          ls.StartTime,
//          ls.EndTime
//        FROM lecture_schedule AS ls
//        JOIN subject AS s
//          ON ls.SubjectID = s.SubjectID
//        WHERE ls.UserID = ?`,
//       [req.user.userId]
//     );
//     return res.json(rows);
//   } catch (err) {
//     console.error('[/my-schedule] Error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // 5. Slides list for a subject
// app.get('/slides', authMiddleware, async (req, res) => {
//   const subjectId = req.query.subjectId;
//   if (!subjectId) {
//     return res.status(400).json({ error: 'subjectId query parameter is required' });
//   }
//   try {
//     const [rows] = await pool.query(
//       `SELECT SlideID, Title, Description, file_path, uploaded_at, SubjectID
//        FROM slide
//        WHERE SubjectID = ?`,
//       [subjectId]
//     );
//     return res.json(rows);
//   } catch (err) {
//     console.error('[/slides] Error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // Multer setup for uploads/
// const upload = multer({ dest: 'uploads/' });

// // 6. Upload one material file
// app.post(
//   '/subjects/:subjectId/materials',
//   authMiddleware,
//   upload.single('file'),
//   async (req, res) => {
//     const { subjectId } = req.params;
//     const { title, description } = req.body;
//     const file = req.file;
//     if (!title) {
//       return res.status(400).json({ error: 'Title is required' });
//     }
//     const contentPath = file ? file.path : null;
//     try {
//       await pool.query(
//         `INSERT INTO slide (Title, Description, Content, file_path, SubjectID)
//          VALUES (?, ?, ?, ?, ?)`,
//         [title, description || null, description || '', contentPath, subjectId]
//       );
//       return res.json({ message: 'Slide added successfully' });
//     } catch (err) {
//       console.error('[/subjects/:subjectId/materials] Error:', err);
//       return res.status(500).json({ error: 'Internal server error' });
//     }
//   }
// );

// // 7. Which subjects belong to me?
// app.get('/my-subjects', authMiddleware, async (req, res) => {
//   try {
//     const [rows] = await pool.query(`
//       SELECT DISTINCT
//         s.SubjectID AS SubjectID,
//         s.Name      AS Name
//       FROM lecture_schedule AS ls
//       JOIN subject           AS s
//         ON ls.SubjectID = s.SubjectID
//       WHERE ls.UserID = ?
//     `, [req.user.userId]);
//     return res.json(rows);
//   } catch (err) {
//     console.error('[/my-subjects] Error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));




// // index.js
// import express from 'express';
// import cors from 'cors';
// import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken';
// import { pool } from './db.js';
// import multer from 'multer';
// import dotenv from 'dotenv';
// import path from 'path';

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// // 0. Serve uploads/ as static so GET /uploads/<file> returns the raw file
// app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// // Helper to sign JWTs
// function generateToken(user) {
//   return jwt.sign(
//     { userId: user.UserID, role: user.role, email: user.email },
//     process.env.JWT_SECRET,
//     { expiresIn: '4h' }
//   );
// }

// // Multer storage: preserve original extension, add timestamp
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/');
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     const base = path.basename(file.originalname, ext);
//     cb(null, `${base}-${Date.now()}${ext}`);
//   },
// });
// const upload = multer({ storage });

// // ----------------------
// // 1. Login
// // ----------------------
// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;
//   if (!email || !password) {
//     return res.status(400).json({ error: 'Email and password are required' });
//   }
//   try {
//     const [rows] = await pool.query(
//       'SELECT UserID, email, password, role FROM `user` WHERE email = ?',
//       [email]
//     );
//     if (rows.length === 0) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }
//     const user = rows[0];
//     // للمحاكاة نطابق النص، ولكن في الإنتاج عليك استخدام bcrypt.compare
//     const match = (password === user.password);
//     if (!match) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }
//     const token = generateToken(user);
//     return res.json({
//       message: 'Login successful',
//       token,
//       user: { userId: user.UserID, role: user.role, email: user.email }
//     });
//   } catch (err) {
//     console.error('[/login] Error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // ----------------------
// // 2. Forgot-password
// // ----------------------
// app.post('/forgot-password', async (req, res) => {
//   const { email } = req.body;
//   if (!email) {
//     return res.status(400).json({ error: 'Email is required' });
//   }
//   try {
//     const [rows] = await pool.query(
//       'SELECT UserID FROM `user` WHERE email = ?',
//       [email]
//     );
//     if (rows.length === 0) {
//       return res.status(404).json({ error: 'Email not found' });
//     }
//     const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
//     console.log(`Password reset link: https://yourdomain.com/reset-password?token=${resetToken}`);
//     return res.json({ message: 'Reset link sent to your email (simulated)' });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // ----------------------
// // 3. Reset-password
// // ----------------------
// app.post('/reset-password', async (req, res) => {
//   const { token, newPassword } = req.body;
//   if (!token || !newPassword) {
//     return res.status(400).json({ error: 'Token and new password are required' });
//   }
//   try {
//     const payload = jwt.verify(token, process.env.JWT_SECRET);
//     const hashed = await bcrypt.hash(newPassword, 10);
//     await pool.query(
//       'UPDATE `user` SET password = ? WHERE email = ?',
//       [hashed, payload.email]
//     );
//     return res.json({ message: 'Password has been reset' });
//   } catch (err) {
//     console.error(err);
//     return res.status(400).json({ error: 'Invalid or expired token' });
//   }
// });

// // ----------------------
// // JWT-check middleware
// // ----------------------
// function authMiddleware(req, res, next) {
//   const auth = req.headers.authorization;
//   if (!auth?.startsWith('Bearer ')) {
//     return res.status(401).json({ error: 'Unauthorized' });
//   }
//   const token = auth.split(' ')[1];
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     return next();
//   } catch {
//     return res.status(401).json({ error: 'Invalid token' });
//   }
// }

// // ----------------------
// // 4. My schedule
// // ----------------------
// app.get('/my-schedule', authMiddleware, async (req, res) => {
//   try {
//     const [rows] = await pool.query(
//       `SELECT
//          ls.ScheduleID,
//          ls.UserID,
//          ls.SubjectID,
//          s.Name AS SubjectName,
//          ls.DayOfWeek,
//          ls.StartTime,
//          ls.EndTime
//        FROM lecture_schedule AS ls
//        JOIN subject AS s
//          ON ls.SubjectID = s.SubjectID
//        WHERE ls.UserID = ?`,
//       [req.user.userId]
//     );
//     return res.json(rows);
//   } catch (err) {
//     console.error('[/my-schedule] Error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // ----------------------
// // 5. Slides list
// // ----------------------
// app.get('/slides', authMiddleware, async (req, res) => {
//   const subjectId = req.query.subjectId;
//   if (!subjectId) {
//     return res.status(400).json({ error: 'subjectId query parameter is required' });
//   }
//   try {
//     const [rows] = await pool.query(
//       `SELECT SlideID, Title, Description, file_path, uploaded_at, SubjectID
//        FROM slide
//        WHERE SubjectID = ?`,
//       [subjectId]
//     );
//     return res.json(rows);
//   } catch (err) {
//     console.error('[/slides] Error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // ----------------------
// // 6. Upload one material file
// // ----------------------
// app.post(
//   '/subjects/:subjectId/materials',
//   authMiddleware,
//   upload.single('file'),
//   async (req, res) => {
//     const { subjectId } = req.params;
//     const { title, description } = req.body;
//     const file = req.file;

//     if (!title) {
//       return res.status(400).json({ error: 'Title is required' });
//     }
//     if (!file) {
//       return res.status(400).json({ error: 'File is required' });
//     }

//     const contentPath = file.path; // e.g. "uploads/name-1684000000000.pdf"

//     try {
//       const [result] = await pool.query(
//         `INSERT INTO slide (Title, Description, Content, file_path, SubjectID)
//          VALUES (?, ?, ?, ?, ?)`,
//         [title, description || null, description || '', contentPath, subjectId]
//       );

//       // Return the newly created slide info (incl. file_path)
//       return res.json({
//         message: 'Slide added successfully',
//         slide: {
//           id: result.insertId,
//           title,
//           description: description || '',
//           file_path: contentPath,
//           uploaded_at: new Date()
//         }
//       });
//     } catch (err) {
//       console.error('[/subjects/:subjectId/materials] Error:', err);
//       return res.status(500).json({ error: 'Internal server error' });
//     }
//   }
// );

// // ----------------------
// // 7. My subjects
// // ----------------------
// app.get('/my-subjects', authMiddleware, async (req, res) => {
//   try {
//     const [rows] = await pool.query(
//       `SELECT DISTINCT
//          s.SubjectID AS SubjectID,
//          s.Name      AS Name
//        FROM lecture_schedule AS ls
//        JOIN subject           AS s
//          ON ls.SubjectID = s.SubjectID
//        WHERE ls.UserID = ?`,
//       [req.user.userId]
//     );
//     return res.json(rows);
//   } catch (err) {
//     console.error('[/my-subjects] Error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(cors());
// للتعامل مع form-data (ملفات + حقول نصية)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// —————— Health check على الجذر ——————
app.get('/', (req, res) => {
  res.send('📚 Slide‑Backend API is up and running!');
});

// 0. Serve uploads/ as static
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 1) Helper: إصدار التوكن
function generateToken(user) {
  return jwt.sign(
    { userId: user.UserID, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '4h' }
  );
}

// 2) Multer storage: نحتفظ بالامتداد ونولد اسم يعتمد على timestamp
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // تأكد من وجود المجلد
    const dir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(dir)) {
      console.log('>>> إنشاء مجلد uploads/');
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}${ext}`;
    console.log(`>>> Multer حفظ الملف كـ: ${filename}`);
    cb(null, filename);
  },
});
const upload = multer({ storage });

// ----------------------
// 3) Login
// ----------------------
app.post('/login', async (req, res) => {
  console.log('[POST /login] body:', req.body);
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT UserID, email, password, role FROM `user` WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    // demo only: compare plaintext; in prod use bcrypt.compare
    const match = (password === user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken(user);
    return res.json({
      message: 'Login successful',
      token,
      user: { userId: user.UserID, role: user.role, email: user.email }
    });
  } catch (err) {
    console.error('[/login] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------
// 4) Forgot-password
// ----------------------
app.post('/forgot-password', async (req, res) => {
  console.log('[POST /forgot-password] body:', req.body);
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const [rows] = await pool.query(
      'SELECT UserID FROM `user` WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }
    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log(`>>> Password reset link: https://yourdomain.com/reset-password?token=${resetToken}`);
    return res.json({ message: 'Reset link sent to your email (simulated)' });
  } catch (err) {
    console.error('[/forgot-password] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------
// 5) Reset-password
// ----------------------
app.post('/reset-password', async (req, res) => {
  console.log('[POST /reset-password] body:', req.body);
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE `user` SET password = ? WHERE email = ?',
      [hashed, payload.email]
    );
    return res.json({ message: 'Password has been reset' });
  } catch (err) {
    console.error('[/reset-password] Error:', err);
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// ----------------------
// 6) JWT middleware
// ----------------------
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    console.error('[/authMiddleware] Invalid token:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ----------------------
// 7) My schedule
// ----------------------
app.get('/my-schedule', authMiddleware, async (req, res) => {
  console.log('[GET /my-schedule] user:', req.user);
  try {
    const [rows] = await pool.query(
      `SELECT
         ls.ScheduleID, ls.UserID, ls.SubjectID,
         s.Name AS SubjectName,
         ls.DayOfWeek, ls.StartTime, ls.EndTime
       FROM lecture_schedule ls
       JOIN subject s
         ON ls.SubjectID = s.SubjectID
       WHERE ls.UserID = ?`,
      [req.user.userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[/my-schedule] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------
// 8) Slides list (دعم جميع أنواع الملفات)
// ----------------------
app.get('/slides', authMiddleware, async (req, res) => {
  const subjectId = req.query.subjectId;
  console.log('[GET /slides] subjectId=', subjectId);
  if (!subjectId) {
    return res.status(400).json({ error: 'subjectId query parameter is required' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT SlideID, Title, Description, file_path, uploaded_at, SubjectID
       FROM slide
       WHERE SubjectID = ?`,
      [subjectId]
    );
    console.log('   DB rows:', rows.length);

    const protocol = req.protocol;
    const host     = req.get('host');

    const slides = rows.map(r => {
      let rawPath = null, url = null;
      if (r.file_path) {
        rawPath = `/${r.file_path.replace(/\\/g, '/')}`;
        url     = `${protocol}://${host}${rawPath}`;
      }
      return {
        slideId:    r.SlideID,
        title:      r.Title,
        description:r.Description,
        rawPath,
        url,
        uploadedAt: r.uploaded_at,
        subjectId:  r.SubjectID
      };
    });

    console.log('   ⇒ returning slides:', slides);
    return res.json(slides);
  } catch (err) {
    console.error('❌ [/slides] Error stack:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------
// 9) Upload material (أيّ ملف: PDF، PPTX، صورة، صوت، فيديو…)
// ----------------------
app.post(
  '/subjects/:subjectId/materials',
  authMiddleware,
  upload.single('file'),
  async (req, res) => {
    console.log('[POST /subjects/:subjectId/materials] params:', req.params);
    console.log('[POST /subjects/:subjectId/materials] body:',   req.body);
    console.log('[POST /subjects/:subjectId/materials] file:',   req.file);

    const { subjectId }               = req.params;
    const { title, description = '' } = req.body;
    const file = req.file;

    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!file)  return res.status(400).json({ error: 'File is required' });

    const contentPath = path.relative(process.cwd(), file.path);
    console.log('>>> contentPath:', contentPath);

    try {
      const [result] = await pool.query(
        `INSERT INTO slide
           (Title, Description, Content, file_path, SubjectID)
         VALUES (?, ?, ?, ?, ?)`,
        [title, description, description, contentPath, subjectId]
      );
      console.log('>>> Inserted slide ID:', result.insertId);

      const raw      = `/${contentPath.replace(/\\/g, '/')}`;
      const protocol = req.protocol;
      const host     = req.get('host');

      return res.json({
        message: 'Slide added successfully',
        slide: {
          slideId:    result.insertId,
          title,
          description,
          rawPath:    raw,
          url:        `${protocol}://${host}${raw}`,
          uploadedAt: new Date(),
          subjectId:  Number(subjectId)
        }
      });
    } catch (err) {
      console.error('[/subjects/:subjectId/materials] Error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ----------------------
// 10) My subjects
// ----------------------
app.get('/my-subjects', authMiddleware, async (req, res) => {
  console.log('[GET /my-subjects] user:', req.user);
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT
         s.SubjectID AS SubjectID,
         s.Name      AS Name
       FROM lecture_schedule ls
       JOIN subject s ON ls.SubjectID = s.SubjectID
       WHERE ls.UserID = ?`,
      [req.user.userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[/my-subjects] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT;       // احصل على المنفذ من متغيّر البيئة فقط
if (!PORT) {
  console.error("❌ ERROR: process.env.PORT is not defined");
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
