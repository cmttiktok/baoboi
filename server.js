const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Chuỗi kết nối MongoDB Atlas của bạn
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://tinhocbaoboi2_db_user:Minhphuong97@baohanh.ukjv7kj.mongodb.net/?appName=baohanh';

// Kết nối MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('>>> Ket noi MongoDB Atlas thanh cong!'))
  .catch(err => console.error('>>> Loi ket noi MongoDB:', err));

// Schema định nghĩa cấu trúc dữ liệu đơn sửa chữa
const OrderSchema = new mongoose.Schema({
  orderCode: { type: String, unique: true },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  deviceName: { type: String, required: true },
  imei: String,
  issueDescription: String,
  conditionNotes: String, // Tình trạng máy lúc nhận (trầy xước, móp...)
  status: { type: String, default: 'Đang tiếp nhận' }, // Đang tiếp nhận, Đang sửa chữa, Đã hoàn tất, Đã trả khách
  receivedDate: { type: Date, default: Date.now },
  completedDate: Date,
  warrantyPeriod: { type: String, default: '0' }, // '0', '3', '6', '12' (tháng)
  imageUrl: String,
  notes: String
});

const Order = mongoose.model('Order', OrderSchema);

// ================= API CHO TRANG TRA CỨU (KHÁCH HÀNG) =================

// Tra cứu theo Số Điện Thoại hoặc IMEI (Chứa chữ/số)
app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Vui lòng nhập số điện thoại hoặc IMEI' });
    }

    // Tìm kiếm chính xác hoặc chứa chuỗi tra cứu (không phân biệt hoa thường)
    const searchRegex = new RegExp(query.trim(), 'i');
    
    const orders = await Order.find({
      $or: [
        { phone: query.trim() },
        { imei: searchRegex }
      ]
    }).sort({ receivedDate: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi máy chủ: ' + err.message });
  }
});

// ================= API CHO TRANG ADMIN (QUẢN LÝ) =================

// 1. Lấy tất cả danh sách đơn hàng
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ receivedDate: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy danh sách đơn: ' + err.message });
  }
});

// 2. Tạo đơn sửa chữa mới
app.post('/api/admin/orders', async (req, res) => {
  try {
    // Tạo mã đơn ngẫu nhiên tự động dạng HD + 6 số đuôi timestamp
    const orderCode = `HD${Date.now().toString().slice(-6)}`;

    const newOrder = new Order({
      orderCode,
      customerName: req.body.customerName,
      phone: req.body.phone,
      deviceName: req.body.deviceName,
      imei: req.body.imei,
      issueDescription: req.body.issueDescription,
      conditionNotes: req.body.conditionNotes,
      warrantyPeriod: req.body.warrantyPeriod,
      imageUrl: req.body.imageUrl,
      notes: req.body.notes
    });

    await newOrder.save();
    res.status(201).json({ success: true, message: 'Tạo đơn thành công!', data: newOrder });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tạo đơn: ' + err.message });
  }
});

// 3. Cập nhật trạng thái hoặc thông tin đơn
app.put('/api/admin/orders/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Nếu chuyển trạng thái sang "Đã hoàn tất" hoặc "Đã trả khách", tự động lưu ngày hoàn thành
    if (req.body.status === 'Đã hoàn tất' || req.body.status === 'Đã trả khách') {
      updateData.completedDate = new Date();
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    res.json({ success: true, message: 'Cập nhật thành công!', data: updatedOrder });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật: ' + err.message });
  }
});

// 4. Xóa đơn hàng
app.delete('/api/admin/orders/:id', async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ error: 'Không tìm thấy đơn để xóa' });
    }
    res.json({ success: true, message: 'Xóa đơn hàng thành công!' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa đơn: ' + err.message });
  }
});

// Chạy Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`>>> Server dang chay tai port ${PORT}`);
});
