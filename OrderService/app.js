// OrderService/app.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(bodyParser.json());

// MongoDB Connection for Order Service
// mongoose.connect('mongodb+srv://hamdanmadara:E4tkOQCuS1kW6krf@learningnode.bhr32.mongodb.net/order_service', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// });

const connectDb = async () => {
    try {
        console.log("Attempting DB connection");
        await mongoose.connect('mongodb+srv://hamdanmadara:E4tkOQCuS1kW6krf@learningnode.bhr32.mongodb.net/order_service', {
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

// Order Schema
const OrderSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true 
  },
  products: [{ 
    productId: { 
      type: String, 
      required: true 
    },
    quantity: { 
      type: Number, 
      required: true 
    }
  }],
  totalPrice: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING' 
  }
});

const Order = mongoose.model('Order', OrderSchema);

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

// Place an Order
app.post('/orders',verifyToken, async (req, res) => {
  try {
    const { userId, products } = req.body;

    // Validate user
    try {
      await axios.get(`http://localhost:5001/users/${userId}`);
    } catch (error) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate and check product availability
    let totalPrice = 0;
    const validatedProducts = [];

    for (let item of products) {
      try {
        const productResponse = await axios.get(`http://localhost:5002/products/${item.productId}`);
        const product = productResponse.data;

        // Check product availability
        if (product.quantity < item.quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock for product ${product.name}` 
          });
        }

        // Calculate total price
        totalPrice += product.price * item.quantity;

        validatedProducts.push({
          productId: item.productId,
          quantity: item.quantity
        });

        // Update product quantity
        await axios.patch(
          `http://localhost:5002/products/${item.productId}/quantity`, 
          { quantity: product.quantity - item.quantity }
        );
      } catch (error) {
        return res.status(404).json({ 
          message: `Product with ID ${item.productId} not found` 
        });
      }
    }

    // Create order
    const newOrder = new Order({
      userId,
      products: validatedProducts,
      totalPrice
    });

    await newOrder.save();

    res.status(201).json({ 
      message: 'Order placed successfully',
      orderId: newOrder._id,
      totalPrice 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error placing order', 
      error: error.message 
    });
  }
});

// Get Orders by User ID
app.get('/orders/:userId',verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId });
    
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching orders', 
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
});