// PaymentService/app.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5004;

// Middleware
app.use(bodyParser.json());

// MongoDB Connection for Payment Service
// mongoose.connect('mongodb+srv://hamdanmadara:E4tkOQCuS1kW6krf@learningnode.bhr32.mongodb.net/payment_service', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// });

const connectDb = async () => {
    try {
        console.log("Attempting DB connection");
        await mongoose.connect('mongodb+srv://hamdanmadara:E4tkOQCuS1kW6krf@learningnode.bhr32.mongodb.net/payment_service', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000
        });
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
}
connectDb()

// Payment Schema
const PaymentSchema = new mongoose.Schema({
  orderId: { 
    type: String, 
    required: true 
  },
  userId: { 
    type: String, 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Payment = mongoose.model('Payment', PaymentSchema);

const verifyToken = async (req, res, next) => {
    try{
        const {token} = req.body;

        if (!token) {
            throw new Error("Access Denied: No Token Provided")
        }
        console.log("1")
        // const token = req.cookies.token;
        const JWT_SECRET = 'Microservice@!789'

        // if (!token) {
        //     throw new Error('No token, authorization denied')
        // }
        console.log("2")
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("3")
        const {_id} = decoded
        // const user = await User.findById(_id)
        const user = await axios.get(`http://localhost:5001/users/${_id}`);

        // console.log(user,decoded)
        // req.user = user; // Attach decoded user data to request object
        if(!user){
            throw new Error("User not found")
        }
        req.user = user;
        next();

    }
    catch (err){
        res.status(401).json({ message: err.message ,status:false});
    }
   
};

// Process Payment
app.post('/pay',verifyToken, async (req, res) => {
  try {
    const { orderId, userId, amount } = req.body;

    // Validate order exists
    try {
      await axios.get(`http://order-service:5003/orders/${userId}`);
    } catch (error) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Simulate payment processing
    const paymentSuccess = Math.random() > 0.1; // 90% success rate

    const newPayment = new Payment({
      orderId,
      userId,
      amount,
      status: paymentSuccess ? 'SUCCESS' : 'FAILED'
    });

    await newPayment.save();

    if (paymentSuccess) {
      res.status(200).json({ 
        message: 'Payment processed successfully',
        paymentId: newPayment._id,
        status: 'SUCCESS'
      });
    } else {
      res.status(400).json({ 
        message: 'Payment processing failed',
        paymentId: newPayment._id,
        status: 'FAILED'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error processing payment', 
      error: error.message 
    });
  }
});

// Get Payments by User ID
app.get('/payments/:userId',verifyToken, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.params.userId });
    
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching payments', 
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
});