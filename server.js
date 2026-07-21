const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Kết nối MongoDB Atlas (Thay link của bạn vào đây)
mongoose.connect('YOUR_MONGODB_CONNECTION_STRING')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schema dữ liệu đơn sửa chữa
const OrderSchema = new mongoose.Schema({
  orderCode: { type: String, unique: true },
  customerName: String,
  phone: String,
  deviceName: String,
  imei: String,
  issueDescription: String,
  conditionNotes: String, // Tình trạng máy lúc nhận (trầy, móp...)
  status: { type: String, default: 'Đang tiếp nhận' }, // Đang tiếp nhận, Đang sửa, Đã hoàn tất, Đã trả khách
  receivedDate: { type: Date, default: Date.now },
  completedDate: String,
  warrantyPeriod: String, // '0', '3_months', '6_months', '12_months'
  imageUrl: String,
  notes: String
});

const Order = mongoose.model('Order', OrderSchema);

// API 1: Khách hàng tra cứu theo SĐT hoặc IMEI
app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Vui lòng nhập số điện thoại hoặc IMEI' });

    const orders = await Order.find({
      $or: [{ phone: query }, { imei: query }]
    }).sort({ receivedDate: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API 2: Lấy tất cả đơn cho trang Admin
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ receivedDate: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API 3: Admin tạo đơn sửa chữa mới
app.post('/api/admin/orders', async (req, res) => {
  try {
    const count = await Order.countDocuments();
    const orderCode = `HD${Date.now().toString().slice(-6)}`; // Tạo mã tự động VD: HD492810
    
    const newOrder = new Order({
      orderCode,
      ...req.body
    });

    await newOrder.save();
    res.status(201).json({ success: true, data: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API 4: Admin cập nhật trạng thái đơn
app.put('/api/admin/orders/:id', async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
