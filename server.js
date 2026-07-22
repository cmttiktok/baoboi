const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://tinhocbaoboi2_db_user:Minhphuong97@baohanh.ukjv7kj.mongodb.net/?appName=baohanh';

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('>>> DB Connected!'))
  .catch(err => console.error('>>> DB Error:', err));

const OrderSchema = new mongoose.Schema({
  orderCode: { type: String, unique: true },
  serviceType: { type: String, default: 'Sửa chữa' },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  deviceName: { type: String, required: true },
  
  // Bổ sung 2 trường giá cả & doanh thu
  costPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  
  imei: String,
  issueDescription: String,
  conditionNotes: String,
  status: { type: String, default: 'Đang tiếp nhận' }, 
  receivedDate: { type: Date, default: Date.now },
  completedDate: Date,
  warrantyPeriod: { type: Number, default: 0 },
  inImages: [String],
  outImages: [String],
  notes: String
});

const Order = mongoose.model('Order', OrderSchema);

// API Tra cứu cho khách (Hỗ trợ tra cứu theo orderCode từ QR Code)
app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Nhập SĐT, IMEI hoặc Mã đơn' });

    const searchRegex = new RegExp(query.trim(), 'i');
    const orders = await Order.find({
      $or: [{ phone: query.trim() }, { imei: searchRegex }, { orderCode: searchRegex }]
    }).sort({ receivedDate: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Kiểm tra lịch sử sửa chữa cũ (Tính năng 4)
app.get('/api/admin/history', async (req, res) => {
  try {
    const { imei, phone } = req.query;
    if (!imei && !phone) return res.json([]);
    
    const queryConditions = [];
    if (imei && imei.trim() !== '') queryConditions.push({ imei: imei.trim() });
    if (phone && phone.trim() !== '') queryConditions.push({ phone: phone.trim() });

    const history = await Order.find({ $or: queryConditions }).sort({ receivedDate: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json([]);
  }
});

// API Admin
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ receivedDate: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json([]);
  }
});

app.post('/api/admin/orders', async (req, res) => {
  try {
    const orderCode = `HD${Date.now().toString().slice(-6)}`;
    
    // Bóc tách và xử lý dữ liệu số
    const costPrice = req.body.costPrice !== undefined && req.body.costPrice !== "" ? Number(req.body.costPrice) : 0;
    const sellingPrice = req.body.sellingPrice !== undefined && req.body.sellingPrice !== "" ? Number(req.body.sellingPrice) : 0;

    const newOrder = new Order({
      ...req.body,
      orderCode,
      costPrice,
      sellingPrice,
      receivedDate: req.body.receivedDate ? new Date(req.body.receivedDate) : new Date()
    });
    
    await newOrder.save();
    res.json({ success: true, data: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/orders/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Đảm bảo ép kiểu số khi cập nhật giá
    if (updateData.costPrice !== undefined) {
      updateData.costPrice = updateData.costPrice !== "" ? Number(updateData.costPrice) : 0;
    }
    if (updateData.sellingPrice !== undefined) {
      updateData.sellingPrice = updateData.sellingPrice !== "" ? Number(updateData.sellingPrice) : 0;
    }

    if (req.body.status === 'Đã hoàn tất' || req.body.status === 'Đã trả khách') {
      if (!updateData.completedDate) updateData.completedDate = new Date();
    }
    
    const updated = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/orders/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
