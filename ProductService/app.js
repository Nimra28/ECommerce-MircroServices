// ProductService/app.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(bodyParser.json());

// MongoDB Connection for Product Service
// mongoose.connect('mongodb+srv://hamdanmadara:E4tkOQCuS1kW6krf@learningnode.bhr32.mongodb.net/product_service', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// });

const connectDb = async () => {
    try {
        console.log("Attempting DB connection");
        await mongoose.connect('mongodb+srv://hamdanmadara:E4tkOQCuS1kW6krf@learningnode.bhr32.mongodb.net/product_service', {
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

// Product Schema
const ProductSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true 
  }
});

const Product = mongoose.model('Product', ProductSchema);

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

// Get All Products
app.get('/products',verifyToken, async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching products', 
      error: error.message 
    });
  }
});

// Add a New Product
app.post('/products',verifyToken, async (req, res) => {
  try {
    const { name, description, price, quantity } = req.body;

    const newProduct = new Product({
      name,
      description,
      price,
      quantity
    });

    await newProduct.save();

    res.status(201).json({ 
      message: 'Product added successfully',
      product: newProduct 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error adding product', 
      error: error.message 
    });
  }
});

// Get Product by ID
app.get('/products/:productId',verifyToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching product', 
      error: error.message 
    });
  }
});

// Update Product Quantity
app.patch('/products/:productId/quantity',verifyToken, async (req, res) => {
  try {
    const { quantity } = req.body;
    const product = await Product.findById(req.params.productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.quantity = quantity;
    await product.save();

    res.status(200).json({ 
      message: 'Product quantity updated',
      product 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating product quantity', 
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Product Service running on port ${PORT}`);
});