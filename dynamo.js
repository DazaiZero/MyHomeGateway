const AWS = require('aws-sdk');
let dynamoDocumnet = new AWS.DynamoDB.DocumentClient();

const Dynamo = {
    query: async ({tableName,index, queryKey, queryValue}) => {
        const params = {
            TableName: tableName ,
            IndexName: index,
            KeyConditionExpression: `${queryKey} = :hkey`,
            ExpressionAttributeValues: {
                ':hkey': queryValue,
            },
        };

        const res = await dynamoDocumnet.query(params).promise();
        //console.log(res);
        return res || [];
    },

    async put (tableName,event) {
        //console.log("in put");
        const connectionId = event.requestContext.connectionId;
        //console.log(event);
        let usercode = connectionId;
        //const type = data.auth;
        const isBoardConnected = "0";
        let data;
        let Op;
        let StartDate;
        let EndDate = new Date();
        if(event.body){
            data = JSON.parse(event.body);
            Op = data.Op; 
            usercode = data.auth;
            StartDate = new Date();
            EndDate.setDate(StartDate.getDate() + 31);
            //console.log(Op);
        }
        if(Op == 99){
            let Plan = String(data.plan);
            const params = {
                TableName: tableName ,
                Item: {
                  id: usercode,
                  usercode: usercode,
                  isSubscribed: "1",
                  startdate: StartDate.toISOString().replace(/T/, ' ').replace(/\..+/, ''),
                  enddate: EndDate.toISOString().replace(/T/, ' ').replace(/\..+/, ''),
                  plan: Plan
                }
            };    
            //console.log(params);
            return dynamoDocumnet.put(params).promise();
        }else{
            const params = {
                TableName: tableName ,
                Item: {
                  connectionId: connectionId,
                  usercode: usercode,
                  isConnected: isBoardConnected
                }
            };
            //console.log(params);
            return dynamoDocumnet.put(params).promise();    
        }
    },

    isConnected : async ({tableName,index, queryKey, queryValue}) => {
        const params = {
            TableName: tableName ,
            IndexName: index,
            KeyConditionExpression: `${queryKey} = :hkey`,
            ExpressionAttributeValues: {
                ':hkey': queryValue,
            },
            FilterExpression
        };

        const res = await dynamoDocumnet.query(params).promise();
        //console.log(res);
        return res || [];
    },

    async delete(TableName,connectionId){
        const params = {
            TableName: TableName,
            Key: {
              connectionId: connectionId 
            }
          };
        //console.log(params);
        return dynamoDocumnet.delete(params).promise();
    },

    update: async ({ tableName, primaryKey, primaryKeyValue, data, updateKeyA, updateKeyB, updateKeyC,isConn}) => {
        const Op = data.Op;
        //console.log(data);
        var usercode = data.auth;
        var bssid = data.bssid;
        var typeC = data.type;
        //console.log(isConn);
        var type = "0";
        if(Op == 97){
            let IsSub = "0";
            const params = {
                TableName: tableName,
                Key: { [primaryKey]: primaryKeyValue },
                UpdateExpression: `set ${updateKeyB} = :updateValueB`,
                ExpressionAttributeValues: {
                    ':updateValueB': IsSub,
                },
            };
            console.log("97");
            return dynamoDocumnet.update(params).promise();
        }
        if(typeC > 0){
            isConn = isConn + 1;
            type = ""+isConn+"";
            const params = {
                TableName: tableName,
                Key: { [primaryKey]: primaryKeyValue },
                UpdateExpression: `set ${updateKeyA} = :updateValueA, ${updateKeyB} = :updateValueB, ${updateKeyC} = :updateValueC`,
                ExpressionAttributeValues: {
                    ':updateValueA': usercode,
                    ':updateValueB': type,
                    ':updateValueC': bssid
                },
            };
            return dynamoDocumnet.update(params).promise();
        }else{
            const params = {
                TableName: tableName,
                Key: { [primaryKey]: primaryKeyValue },
                UpdateExpression: `set ${updateKeyA} = :updateValueA, ${updateKeyC} = :updateValueC`,
                ExpressionAttributeValues: {
                    ':updateValueA': usercode,
                    ':updateValueC': bssid
                },
            };
            return dynamoDocumnet.update(params).promise();
        }
    }
};

module.exports = Dynamo;