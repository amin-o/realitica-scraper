#!/usr/bin/env node

const cheerio = require("cheerio");
const axios = require("axios");
const otc = require('objects-to-csv');
const path = require('path');
const fs = require('fs')
const csvToJSON = require('csv-file-to-json');

//get accomodation links from multiple pages
async function getAccomodationsFromMultiplePages(numberOfPages){

    let startPage = 'https://www.realitica.com/index.php?for=Prodaja&pZpa=Crna+Gora&pState=Crna+Gora&type%5B%5D=&price-min=&price-max=&qry=&lng=hr'

    try{

        let scavagedLinks = [];

        for(let i = 0; i < numberOfPages; i++){

            if(i === 0){

                scavagedLinks.push(await getAccomodationLinks(startPage));

            } else {
            
                let currentPage = `https://www.realitica.com/?cur_page=${i}&for=Prodaja&pZpa=Crna+Gora&pState=Crna+Gora&type%5B%5D=&lng=hr`;

                scavagedLinks.push(await getAccomodationLinks(currentPage));

            }

        }
 
        return scavagedLinks.flat(1);

    } catch {

        console.log('Mass link scavanging failed!')

    }

}

//get accomocation links from a page
async function getAccomodationLinks(url){

    try{

        const { data } = await axios.get(url);

        const $ = cheerio.load(data);

        const links = $('body').find('.thumb_div > a').toArray();

        let linkBatch = [];

        links.forEach(x => {

           linkBatch.push(x.attribs.href);

        });

        return linkBatch;


    } catch {

        console.log('Error fetching accomodation links!')

    }

}

//check if its input exists on the page we are scraping.
function regexCheck(input){

    if(input){

        return input[1];

    } else{

        return input = '[NO DATA]'

    }

}

//set true and false based on regex match
function booleanRegexCheck(input){

    if(input){

        return 'TRUE';

    } else {

        return 'FALSE';

    }

}

//parse csv file and convert it to an object
async function parseCsvFile(){

    const dataInJSON = csvToJSON({ filePath: path.resolve(__dirname + "/../accomodation.csv"),separator: "," });
    return dataInJSON;
    
}

//check if id already exists inside the csv file
function checkIfIdExists(id, csvData){
    
    let flag = false;    

    for(let i = 0; i < csvData.length;i++){

        if(csvData[i]['id'] == id){

            flag = true;
            break;

        }

    }
    return flag;
}

//grab all data from a page
async function getDataFromPage(url, csvData){

    try{

        //get id from the pages-s url
        const id = url.match('/listing\/(.*)$')[1]

        //if id already exists in the csv file exit!
        if(checkIfIdExists(id,csvData)){
            return;
        }

        //grab html from the page
        const { data } = await axios.get(url);

        //extract data 
        let type = regexCheck(data.match(/<strong>Vrsta<\/strong>:(.*?)<br.*\/>/)) ;
        let territory = regexCheck(data.match(/<strong>Područje<\/strong>:(.*?)<br.*\/>/));
        let location = regexCheck(data.match(/<strong>Lokacija<\/strong>:(.*?)<br.*\/>/));
        let address = regexCheck(data.match(/<strong>Adresa<\/strong>:(.*?)<br.*\/>/));
        let numOfBedrooms = regexCheck(data.match(/<strong>Spavaćih Soba<\/strong>:(.*?)<br.*\/>/));
        let numOfBathrooms = regexCheck(data.match(/<strong>Kupatila<\/strong>:(.*?)<br.*\/>/));
        let price = regexCheck(data.match(/<strong>Cijena<\/strong>: &euro;(.*?)<br.*\/>/));
        let numOfParkingSpaces = regexCheck(data.match(/<strong>Parking Mjesta<\/strong>:(.*?)<br.*\/>/));
        let distanceFromSea = regexCheck(data.match(/<strong>Od Mora \(m\)<\/strong>:(.*?)<br.*\/>/));
        let description = regexCheck(data.match(/<strong>Opis<\/strong>:(.*?)<br.*\/>/));
        let advertiser = regexCheck(data.match(/<a href="\/\?action=searchresults&user_ID=.*">(.*?)<\/a>/));
        let mobile = regexCheck(data.match(/<strong>Mobitel<\/strong>:(.*?)<br.*\/>/));
        let lastChanged = regexCheck(data.match(/<strong>Zadnja Promjena<\/strong>:(.*?)\n<br.*/));
        let livingArea = regexCheck(data.match(/<strong>Stambena Površina<\/strong>:(.*?)m<font/));
        let title = regexCheck(data.match(/<h2>(.*?)<\/h2>/));
        let moreDetailsOn = regexCheck(data.match(/<strong>Više detalja na<\/strong>:.*href="(.*?)\/"/));
        let newConstruction = booleanRegexCheck(data.match(/<strong>Novogradnja.*<\/strong>/));
        let airConditioning = booleanRegexCheck(data.match(/<strong>Klima.*<\/strong>/));

        let images = [];
        const $ = cheerio.load(data);
        $('#rea_blueimp').find('a').each(function() {

            images.push($(this).attr('href'));

        });

        let obj = {

            id: id,
            title:title,
            type: type,
            location: location,
            territory: territory,
            address: address,
            price: price,
            advertiser: advertiser,
            mobile: mobile,
            livingArea: livingArea,
            numOfBathrooms: numOfBathrooms,
            numOfBedrooms: numOfBedrooms,
            numOfParkingSpaces: numOfParkingSpaces,
            distanceFromSea: distanceFromSea,
            newConstruction: newConstruction,
            airConditioning: airConditioning,
            lastChanged: lastChanged,
            moreDetailsOn: moreDetailsOn,
            images: images,
            description: description

        }
        
        //append to the csv file
        new otc([obj]).toDisk('./accomodation.csv', { append: true});
             
    }catch(err){
        
        console.log(err);

    }

}

//scrape function for cron. Scrape only and update the csv file
async function scrapeOnly(req,res){

    try{

        const csvData = await parseCsvFile();

        //set the amount of pages u want to scrape in the arg
        const allLinks = await getAccomodationsFromMultiplePages(2);

        for(let i = 0; i < allLinks.length;i++){
       
            await getDataFromPage(allLinks[i],csvData);
        
        }
        
    }catch(err){

        console.log(err);

    }

};

//main scrape function. Scrape and send the csv file on request
async function scrape(req,res,next){

    try{

        const csvData = await parseCsvFile();

        //set the amount of pages u want to scrape in the arg
        const allLinks = await getAccomodationsFromMultiplePages(2);

        for(let i = 0; i < allLinks.length;i++){
       
            await getDataFromPage(allLinks[i],csvData);
        
        }

        next();

    }catch(err){

        console.log(err);

    }

};

//after scraping is done send user the csv file with all scraped data
function downloadCSV(req, res){

    res.download(path.resolve(__dirname + "/../accomodation.csv"));

}

module.exports = {

   scrape,
   downloadCSV,
   scrapeOnly

}