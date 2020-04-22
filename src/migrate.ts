import {up} from "./db/schema";

up()
.then(success => {
    console.log("Migration Success");
})
.catch(error => {
    console.error("Migration Failure! ", error);
})
.finally(() =>{
    process.exit(0);
});