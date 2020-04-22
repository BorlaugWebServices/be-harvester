import {down} from "./db/schema";

down()
.then(success => {
    console.log("Rollback Success");
})
.catch(error => {
    console.error("Rollback Failure! ", error);
})
.finally(() =>{
    process.exit(0);
})