// var ls8 =  ee.ImageCollection("LANDSAT/LC08/C01/T1_SR");
//print(ls8.first());

var area = ee.FeatureCollection(geometry);
 var pas = wdpa.filterMetadata('ISO3', 'equals', 'IND')
  .filterMetadata('IUCN_CAT', 'equals', 'IV')
  .filterMetadata('GIS_AREA', 'greater_than', 100)
  .filterMetadata('GIS_AREA', 'less_than', 5000)
  .filterMetadata('ORIG_NAME', 'equals', 'Mudumalai');
print(pas);  
Map.addLayer(pas);

// function to mask cloud and cloud shadow
function maskL8sr(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = (1 << 3);
  var cloudsBitMask = (1 << 5);
  // Get the pixel QA band.
  var qa = image.select('QA60');
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
                 .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask);
}


// get the dataset
var prefire = ee.ImageCollection('COPERNICUS/S2')
                  .filterDate('2019-02-11', '2019-02-15')
                  .map(maskL8sr)
                  .filterBounds(area);

var postfire = ee.ImageCollection('COPERNICUS/S2')
                  .filterDate('2019-02-22', '2019-02-27')
                  .map(maskL8sr)
                  .filterBounds(area);
                  
print(prefire.first());


//making this generalisable

// var visParams = {
//   bands: ['B4', 'B3', 'B2'],
//   min: 0,
//   max: 3000,
//   gamma: 1.4,
// };
// Map.addLayer(prefire.median(), visParams);


// calculate nbr for each image of each of the image collections
var anbr = function(image) {
  var nbr = image.normalizedDifference(['B8', 'B12']).rename('NBR');
  return image.addBands(nbr);
};

var prefire_nbr = prefire.map(anbr);
print(prefire_nbr.first());
var postfire_nbr = postfire.map(anbr);

Map.addLayer(prefire_nbr.select('NBR'));

// ok cool. Now we can do two things
// a) we can mosaic and then calculate delta or 
// b) we can calculate many deltas and then mosaic that
// trying a)
var pref_nbr = prefire_nbr.median();
var postf_nbr = postfire_nbr.median();
print('im here');
print(pref_nbr);
Map.addLayer(pref_nbr, {}, 'nbr');
Map.addLayer(postf_nbr, {}, 'p_nbr');
var delta = pref_nbr.select('NBR').subtract(postf_nbr.select('NBR'));
var dNBR = delta.multiply(1000);
print(postf_nbr);

print(delta);
var sld_intervals =
  '<RasterSymbolizer>' +
    '<ColorMap type="intervals" extended="false" >' +
      '<ColorMapEntry color="#ffffff" quantity="-500" label="-500"/>' +
      '<ColorMapEntry color="#7a8737" quantity="-250" label="-250" />' +
      '<ColorMapEntry color="#acbe4d" quantity="-100" label="-100" />' +
      '<ColorMapEntry color="#0ae042" quantity="100" label="100" />' +
      '<ColorMapEntry color="#fff70b" quantity="270" label="270" />' +
      '<ColorMapEntry color="#ffaf38" quantity="440" label="440" />' +
      '<ColorMapEntry color="#ff641b" quantity="660" label="660" />' +
      '<ColorMapEntry color="#a41fd6" quantity="2000" label="2000" />' +
    '</ColorMap>' +
  '</RasterSymbolizer>';
Map.addLayer(dNBR.sldStyle(sld_intervals), {}, 'dNBR classified');
var nbrdelta_palette = ['0516e7', '0b78ff', 'a0e4ff', 'fffddd', 'ffcbb2', 'ff510f', '491801']; 
Map.addLayer(ee.Image(delta), {palette: nbrdelta_palette}, 'delta');

// try with min for the mosaicing
// why? if nbr = (nir-swir)/(nir+swir) then for burned areas, nir is low so
// this ratio will be negative
var postf_nbrM = postfire_nbr.min();
print(postf_nbrM);
Map.addLayer(postf_nbrM, {}, 'p_nbrM');
var delta1 = pref_nbr.select('NBR').subtract(postf_nbrM.select('NBR'));
print(delta1);
var nbrdelta_palette = ['0516e7', '0b78ff', 'a0e4ff', 'fffddd', 'ffcbb2', 'ff510f', '491801']; 
Map.addLayer(ee.Image(delta1).clip(pas), {palette: nbrdelta_palette}, 'delta1');
var dalt12 = delta1.gte(0);
Map.addLayer(dalt12.clip(pas), {}, 'DELT');
print(dalt12.clip(pas));

// histogram of delta - need region: Mudhumalai?
// var histd = ui.Chart.image.histogram(ee.Image(delta), pas, 30);
// print(histd);
var histd1 = ui.Chart.image.histogram(ee.Image(delta1), pas, 30);
print(histd1);

// // Mask out water using NDWI
// var andwi = function(image) {
//   var ndwi = image.normalizedDifference(['B4', 'B5']).rename('NDWI');
//   return image;
// };

// var prefire_ndwi = prefire.map(andwi);
// var postfire_ndwi = postfire.map(andwi);
// print(prefire_ndwi);


// var prefire_ndwim = prefire_ndwi.mean();
// var postfire_ndwim = postfire_ndwi.mean();
