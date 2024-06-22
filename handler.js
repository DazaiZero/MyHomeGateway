"use strict";

const AWS = require("aws-sdk");
//let dynamo = new AWS.DynamoDB.DocumentClient();
require("aws-sdk/clients/apigatewaymanagementapi");

const dynamo = require("./dynamo");

const TableName = process.env.TableName;
const TableName1 = process.env.TableName1;

const successfullResponse = {
  statusCode: 200,
};

module.exports.connectionHandler = (event, context, callback) => {
  //console.log(event);
  if (event.requestContext.eventType === "CONNECT") {
    addConnection(event, 0)
      .then(() => {
        callback(null, successfullResponse);
      })
      .catch((err) => {
        console.log(err);
        callback(null, JSON.stringify(err));
      });
  }
  if (event.requestContext.eventType === "DISCONNECT") {
    // Handle disconnection
    //console.log(event);
    let connectionId = event.requestContext.connectionId;
    let data = event.requestContext.disconnectReason;
    let type = data.type;

    if (type > 0) {
      dynamo.update({
        tableName: TableName,
        primaryKey: "connectionId",
        primaryKeyValue: connectionId,
        data: data,
        updateKeyA: "usercode",
        updateKeyB: "isConnected",
        isConn: 0,
      });
    }
    deleteConnection(connectionId)
      .then(() => {
        callback(null, successfullResponse);
      })
      .catch((err) => {
        console.log(err);
        callback(null, {
          statusCode: 500,
          body: "Failed to connect: " + JSON.stringify(err),
        });
      });
  }
};

module.exports.defaultHandler = (event, context, callback) => {
  console.log('defaultHandler was called');
  console.log(event);
  let connectionId = event.requestContext.connectionId;
  let data = JSON.parse(event.body);
  let Op = data.Op;
  let isCon = 0;
  let usercode = data.auth;
  if (Op == 99) {
    addConnection(event, 1)
      .then(() => {
        callback(null, successfullResponse);
      })
      .catch((err) => {
        console.log(err);
        callback(null, JSON.stringify(err));
      });
  }
  if (Op == 98) {
    getSubscriptionDetails(event)
      .then(() => {
        callback(null, successfullResponse);
      })
      .catch((err) => {
        console.log(err);
        callback(null, JSON.stringify(err));
      });
  }
  if (Op == 97) {
    dynamo.update({
      tableName: TableName1,
      primaryKey: "id",
      primaryKeyValue: usercode,
      data: data,
      updateKeyB: "isSubscribed",
      isConn: 0,
    });
    sendMessageToAllConnected(event)
      .then(() => {
        callback(null, successfullResponse);
      })
      .catch((err) => {
        console.log(err);
        callback(null, JSON.stringify(err));
      });
  }
  if (Op == 100) {
    return _Pong(event).then(() => {
      callback(null, successfullResponse);
    });
  }
  if (Op == 25) {
    deleteDuplicate(event)
      .then(() => {
        callback(null, successfullResponse);
      })
      .catch((err) => {
        console.log(err);
        callback(null, {
          statusCode: 500,
          body: "Failed to connect: " + JSON.stringify(err),
        });
      });
  }
  if (Op == 5) {
    if (data.type > 0) {
      isCon = 1;
    }
    dynamo.update({
      tableName: TableName,
      primaryKey: "connectionId",
      primaryKeyValue: connectionId,
      data: data,
      updateKeyA: "usercode",
      updateKeyB: "isConnected",
      updateKeyC: "bssid",
      isConn: isCon,
    });
    if (isCon == 1) {
      let bbssid = data.bbssid;
      data.bssid = bbssid;
    }
    sendMessageToAllConnected(event)
      .then(() => {
        callback(null, successfullResponse);
      })
      .catch((err) => {
        console.log(err);
        callback(null, JSON.stringify(err));
      });
  }
  if (Op == 6) {
    if (data.type == 0) {
      getBoardsConnected(event)
        .then(() => {
          callback(null, successfullResponse);
        })
        .catch((err) => {
          console.log(err);
          callback(null, JSON.stringify(err));
        });
    }
  }
  if (Op == 45) {
    if (data.type == 0) {
      sendMessageToAllConnected(event)
        .then(() => {
          callback(null, successfullResponse);
        })
        .catch((err) => {
          console.log(err);
          callback(null, JSON.stringify(err));
        });
    }
  }
  if (Op == 3 || Op == 4) {
    sendMessageToAllConnected(event)
      .then(() => {
        callback(null, successfullResponse);
      })
      .catch((err) => {
        console.log(err);
        callback(null, JSON.stringify(err));
      });
  }
};
module.exports.sendMessageHandler = (event, context, callback) => {
  sendMessageToAllConnected(event)
    .then(() => {
      callback(null, successfullResponse);
    })
    .catch((err) => {
      callback(null, JSON.stringify(err));
    });
};

const _Pong = async (event) => {
  return true; /* sendMessageToAllConnected(event).then(() => {
    callback(null, successfullResponse)
  }).catch (err => {
    console.log(err);
    callback(null, JSON.stringify(err));
  });; */
};

const deleteDuplicate = async (event) => {
  //console.log("Got in deleteDuplicate");
  let data = JSON.parse(event.body);
  let tconnectionId = event.requestContext.connectionId;
  let usercode = data.auth;
  let tbssid = data.bssid;
  //console.log(data);
  let connectionData = await getConnectionDatabyBoard(tbssid);
  //console.log(connectionData);
  return connectionData.Items.map((connectionId) => {
    //console.log(JSON.stringify({connectionId:connectionId,tbssid:tbssid,tconnectionId:tconnectionId}));
    if (connectionId.bssid == tbssid) {
      if (connectionId.connectionId != tconnectionId)
        return deleteConnection(connectionId.connectionId);
    }
  });
};

const getSubscriptionDetails = async (event) => {
  let data = JSON.parse(event.body);
  let connectionId = event.requestContext.connectionId;
  let usercode = data.auth;
  //console.log("Get Subscription");
  let connectionData = await getSubscription(usercode);
  if (connectionData.Count > 0) {
    return connectionData.Items.map((data) => {
      //console.log(JSON.stringify({connectionId:connectionId,tbssid:tbssid,tconnectionId:tconnectionId}));
      //console.log("isSubscribed");
      //console.log(data);
      event.data = JSON.stringify({
        Op: 98,
        isSubscribed: data.isSubscribed,
        data: data,
      });
      event.body = JSON.stringify({
        Op: 98,
        isSubscribed: data.isSubscribed,
        data: data,
      });
      return send(event, connectionId);
    });
  } else {
    event.body = JSON.stringify({ Op: 98, isSubscribed: 0 });
    return send(event, connectionId);
  }
  //console.log(connectionData);
};

const getBoardsConnected = async (event) => {
  let data = JSON.parse(event.body);
  let connectionId = event.requestContext.connectionId;
  let usercode = data.auth;
  let bssid = data.bssid;

  let connectionData = await getConnectionDatabyBoard(bssid);
  if (connectionData) event.data = JSON.stringify({ bstate: 1 });
  else event.data = JSON.stringify({ bstate: 0 });
  //console.log(connectionData);
  return send(event, connectionId);
};

const sendMessageToAllConnected = async (event) => {
  console.log("Got in sendToAll");
  let data = JSON.parse(event.body);
  let tconnectionId = event.requestContext.connectionId;
  let usercode = data.auth;
  let tbssid = data.bssid;
  let type = data.type;
  let mode = data.cmode;
  let connectionData = await getConnectionData(usercode);
  console.log(data);
  console.log(connectionData);
  /* if(data.Op == 100){
    return connectionData.Items.map((connectionId) => {
      if(connectionId.bssid == usercode)
        if(connectionId.connectionId != tconnectionId)
          return send(event, connectionId.connectionId);
    });
  } */
  if (data.Op == 97) {
    event.data = JSON.stringify({ Op: 98, isSubscribed: 0, data: "" });
    event.body = JSON.stringify({ Op: 98, isSubscribed: 0, data: "" });
    return connectionData.Items.map((connectionId) => {
      if (connectionId.usercode == usercode)
        return send(event, connectionId.connectionId);
    });
  } else {
    return connectionData.Items.map((connectionId) => {
      if (data.Op == 5) {
        if (connectionId.bssid != usercode) {
          return send(event, connectionId.connectionId);
        }
      } else {
        if (data.Op == 45) {
          if (connectionId.bssid != usercode) {
            return send(event, connectionId.connectionId);
          }
        } else {
          if (type == 0) {
            if (connectionId.bssid == tbssid) {
              if (connectionId.connectionId != tconnectionId)
                return send(event, connectionId.connectionId);
            } else {
              if (connectionId.connectionId != tconnectionId)
                return send(event, connectionId.connectionId);
              /* if(connectionId.Count == 1){
                event.data = JSON.stringify({Op: 100, isConnected: 0});    
                event.body = JSON.stringify({Op: 100, isConnected: 0});
                return send(event, connectionId.tconnectionId)
              } */
            }
          }
          if (type == 1) {
            //console.log(connectionData);
            if (connectionId.bssid == usercode) {
              if (connectionId.connectionId != tconnectionId)
                return send(event, connectionId.connectionId);
            }
          }
        }
      }
    });
  }
};

const sendMessageToBoard = async (event) => {
  //console.log("Got in sendToBoard");
  let data = JSON.parse(event.body);
  let connectionId = event.requestContext.connectionId;
  let usercode = data.auth;
  let bssid = data.bssid;
  //console.log(data);
  if (bssid) {
    let connectionData = await getConnectionDatabyBoard(bssid);
    //console.log(connectionData);
    return connectionData.Items.map((connectionId) => {
      return send(event, connectionId.connectionId);
    });
  } else {
    event.body = JSON.stringify({ bstate: 0 });
    return send(event, connectionId);
  }
};

const getSubscription = (usercode) => {
  return dynamo.query({
    tableName: TableName1,
    index: "isSub_index",
    queryKey: "usercode",
    queryValue: usercode,
  });
};

const getConnectionData = (usercode) => {
  //console.log(usercode);
  return dynamo.query({
    tableName: TableName,
    index: "user_index",
    queryKey: "usercode",
    queryValue: usercode,
  });
};

const getConnectionDatabyBoard = (bssid) => {
  //console.log(bssid);
  return dynamo.query({
    tableName: TableName,
    index: "bssid_index",
    queryKey: "bssid",
    queryValue: bssid,
  });
};

const send = (event, connectionId) => {
  //console.log("got in send1");
  //console.log(event);
  let body = event.body;
  let postData = body;
  console.log("got in send2");
  let endpoint =
    event.requestContext.domainName + "/" + event.requestContext.stage;
  console.log(endpoint);
  //console.log("got in send3");
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: endpoint,
  });
  console.log("got in send4");
  const params = {
    ConnectionId: connectionId,
    Data: postData,
  };
  console.log(params);
  console.log("got in send5");
  return apigwManagementApi.postToConnection(params).promise();
};

const addConnection = (event, op) => {
  if (op == 1) {
    return dynamo.put(TableName1, event);
  } else {
    return dynamo.put(TableName, event);
  }
};

const deleteConnection = (connectionId) => {
  return dynamo.delete(TableName, connectionId);
};
