const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbpath = path.join(__dirname, "covid19India.db");

const app = express();

app.use(express.json());

let db = null;

// Install DB and Server

const instalizerDbAndSever = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server is running at http://localhost:3000/")
    );
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};

instalizerDbAndSever();

//State table ids convert to pascalcase

const objectSnakeToCamel = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

//Distict table ids convert to pascalcase

const districtSnakeToCamel = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const reportSnaketocamelcse = (dbObject) => {
  return {
    totalCases: dbObject.cases,
    totalCured: dbObject.cured,
    totalActive: dbObject.active,
    totalDeaths: dbObject.deaths,
  };
};

// API1 Returns a list of all states in the state table

app.get("/states/", async (request, response) => {
  const getallStateQuery = `
    SELECT * FROM
      state
    ORDER BY
      state_id;`;
  const allSateArray = await db.all(getallStateQuery);
  const result = allSateArray.map((eachObject) => {
    return objectSnakeToCamel(eachObject);
  });
  response.send(result);
});

//API2 Returns a state based on the state ID

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;

  const getStateIdQuery = `
    SELECT
      *
    FROM
      state
    WHERE
      state_id = ${stateId};`;
  const newState = await db.get(getStateIdQuery);
  const stateresult = objectSnakeToCamel(newState);

  response.send(stateresult);
});

//API3 Create a district in the district table, district_id is auto-incremented

app.post("/districts/", async (request, response) => {
  const createDistrict = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = createDistrict;

  const newDistrict = `INSERT INTO 
   district (district_name,state_id,cases,cured,active,deaths)
    VALUES
    ('${districtName}',
    ${stateId},
    ${cases},
    ${cured},
    ${active},
    ${deaths});`;
  const addDistrict = await db.run(newDistrict);
  const districtId = addDistrict.lastId;
  response.send("District Successfully Added");
});

//API4 Returns a district based on the district ID
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrict = `SELECT * 
  FROM district 
  WHERE district_id=${districtId};`;
  const newDistrict = await db.get(getDistrict);
  const districtResult = districtSnakeToCamel(newDistrict);
  response.send(districtResult);
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDist = `DELETE 
  FROM district
    WHERE district_id=${districtId};`;
  await db.run(deleteDist);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const distDetails = request.body;

  const { districtName, stateId, cases, cured, active, deaths } = distDetails;

  const updateDistrict = `UPDATE district 
  SET
     district_name= '${districtName}',state_id= ${stateId},
     cases=${cases},
     cured=${cured},
     active=${active},deaths=${deaths}
     WHERE district_id=${districtId};`;
  await db.run(updateDistrict);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getstatereport = `
        SELECT SUM(cases) AS cases,
           SUM(cured) AS cured,
           SUM(active) AS active,
           SUM(deaths) AS deaths 
        FROM district 
        WHERE state_id = ${stateId};`;
  const stateReport = await db.get(getstatereport);
  const resultReport = reportSnaketocamelcse(stateReport);
  response.send(resultReport);
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateDetails = `
        SELECT state_name
        FROM state JOIN district
        ON state.state_id=district.state_id
        WHERE district.district_id=${districtId};`;
  const stateName = await db.get(stateDetails);
  response.send({ stateName: stateName.state_name });
});
module.exports = app;
