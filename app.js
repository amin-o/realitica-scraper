#!/usr/bin/env node

const express = require("express");
const app = express();
const cron = require("node-cron");
const axios = require('axios')
const scraperMiddleware = require("./middleware/scraper");
const path = require('path');

const PORT = process.env.PORT || 3000;

app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, '/public')));

app.get('/', (req, res) => {

    res.render('index.hbs')

});


//cron job | Scrape realitica every 5 minutes
const task = cron.schedule('*/5 * * * *', async (req, res) =>  {

    console.log('Cron job running...');
    scraperMiddleware.scrapeOnly();

});

task.start();


//app.get("/scrape", async (req, res) => {
app.get("/scrape",scraperMiddleware.scrape,scraperMiddleware.downloadCSV) 


app.listen(PORT, (err) => {

    if(err){

        console.log(err);

    } else {

        console.log('listening on 3000');

    }

});

 