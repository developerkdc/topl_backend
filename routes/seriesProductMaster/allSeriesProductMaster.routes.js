import express from "express"
import accoRouter from './acco.routes.js';
import barcodeRouter from './barcode.routes.js';
import bunitoRouter from './bunito.routes.js';
import canvasRouter from './canvas.routes.js';
import chromaCollectionRouter from './chromaCollection.routes.js';
import chromaCompositeRouter from './chromaComposite.routes.js';
import chromaRibbedRouter from './chromaRibbed.routes.js';
import furrowLiteRouter from './furrow.lite.routes.js';
import furrowRegantoRouter from './furrow.reganto.routes.js';
import furrowRouter from './furrow.routes.js';
import marvelRouter from './marvel.routes.js';
import mattleRouter from './mattle.routes.js';
import novelRouter from './novel.routes.js';
import regantoClassicRouter from './reganto.classic.routes.js';
import regantoPremierRouter from './reganto.premier.routes.js';
import regantoDezinerRouter from './regantoDeziner.routes.js';

const allSeriesProductMasterRouter = express.Router();

allSeriesProductMasterRouter.use(`/series-product-master`,[
    barcodeRouter,
    chromaCollectionRouter,
    chromaRibbedRouter,
    chromaCompositeRouter,
    canvasRouter,
    regantoDezinerRouter,
    bunitoRouter,
    mattleRouter,
    novelRouter,
    marvelRouter,
    regantoClassicRouter,
    regantoPremierRouter,
    furrowRouter, furrowLiteRouter, furrowRegantoRouter, accoRouter
  ])

export default allSeriesProductMasterRouter;