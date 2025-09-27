const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const apiRouter = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandlers');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
