const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const employeeModel = require('../models/Employee');
const app = express();
const dotenv = require('dotenv');
var refreshTokens = [];

app.use(bodyParser.json());

// get config vars
dotenv.config();

// access config var
process.env.ACCESS_TOKEN_SECRET;
process.env.REFRESH_TOKEN_SECRET;

function generateAccessToken(username) {
  const accessToken = jwt.sign(username, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '120s' });
  const refreshToken = jwt.sign(username, process.env.REFRESH_TOKEN_SECRET);

  refreshTokens.push(refreshToken);

  return { accessToken, refreshToken }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token == null) return res.sendStatus(401)

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    console.log(`Error: ${err}`)

    if (err) return res.sendStatus(403)

    req.user = user

    next()
  })
}

//Get JWT Token
app.post("/login/:username/:password", async (req, res) => {
  const token = generateAccessToken({ username: req.params.username });
  const response = {
    status:'Login success',
    token
  }
  res.status(200).json(response);
})

//Read ALL
app.get('/employees', authenticateToken, async (req, res) => {
  const employees = await employeeModel.find({});

  try {
    res.send(employees);
  } catch (err) {
    res.status(500).send(err);
  }
});

//Get new token if expire
app.post('/token', (req, res) => {
  
  const { token, username } = req.body;

  if (!token) {
      return res.sendStatus(401);
  }

  if (!refreshTokens.includes(token)) {
      return res.sendStatus(403);
  }

  //Verify Refresh Token
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, username) => {
      if (err) {
          return res.sendStatus(403);
      }

      //Generate New Access Token
      const accessToken = jwt.sign(username, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '20m' });

      res.status(200).json({
          accessToken
      });
  });
});

app.post('/logout', (req, res) => {
  const { token } = req.body;
  refreshTokens = refreshTokens.filter(t => t !== token);

  res.status(200).json({message: "Logout successful"});
});



//Search By First Name
app.get('/employees/firstname/:name', authenticateToken, async (req, res) => {
  const name = req.params.name
  const employees = await employeeModel.find({firstname : name});

  try {
    if(employees.length != 0){
      res.send(employees);
    }else{
      res.send(JSON.stringify({status:false, message: "No data found"}))
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

//Create New Record
/*
    //Sample Input as JSON
    //application/json as Body
    {
      "firstname": "Pritesh",
      "lastname": "Patel",
      "salary": "5000"
    }
*/
app.post('/employee', authenticateToken, async (req, res) => {
  //Perform Validation if you needed  
  const employee = new employeeModel(req.body);
  
    try {
      await employee.save();
      res.send(employee);
    } catch (err) {
      res.status(500).send(err);
    }
  });

//Update Record
app.patch('/employee/:id', authenticateToken, async (req, res) => {
    try {
      await employeeModel.findByIdAndUpdate(req.params.id, req.body)
      await employeeModel.save()
      res.send(employee)
    } catch (err) {
      res.status(500).send(err)
    }
  })

//Delete Record
//localhost:8081/employee/5d1f6c3e4b0b88fb1d257237
app.delete('/employee/:id', authenticateToken, async (req, res) => {
    try {
      const employee = await employeeModel.findByIdAndDelete(req.params.id)
  
      if (!employee) 
      {
        res.status(404).send("No item found")
      }
      res.status(200).send()
    } catch (err) {
      res.status(500).send(err)
    }
  })

module.exports = app