var WebSocketServer = require('websocket').server;
var http = require('http');
var parse = require('url');
var join = require('path').join
var qs = require('querystring');
var roooms = {}, signal = null, clients = {}, connection= null, count=0, absroute="/";

var server = http.createServer(function(request, response) {
    var route_ = null;
    var g = parse.parse(request.url);
    if(g.pathname == '/' || g.pathname=='/start_2.html'){
        route_ = '/start_2.html';
    }
    else{
        route_ = g.pathname;
    }
    absroute = "."+route_;
 
    request.setEncoding('utf8');
    if(request.method=='POST'){
      var lista ='';
        request.on('data',function(chunk){
            lista+=chunk;
        });
        request.on('end',function(){
          var t = qs.parse(lista);
          if (t['rol']=='estudiante'){
            if (roooms[t['codigo']]) {
    
              response.setHeader("Set-Cookie", ["codigo="+t['codigo'], "usuario="+t['usuario'], "rol="+t["rol"]]);
            }
            else {
              response.end("<br><br><br><center><img src='Ban_sign.png'></center><center><h1>This classroom has not been initiated, try later </h1></center><center><h1><a href='http://10.0.0.5/test/project/'>Go back</a></h1></center>");
            }
        }
        if (t['rol']=='profesor') {
          response.setHeader("Set-Cookie", ["codigo="+t['codigo'], "usuario="+t['usuario'], "rol="+t["rol"]]);
        }
          t = null;
        });
    }
    else if(request.method=='GET'){
        if(g.query==null){
            if (g.path == '/'){
                serve_files("./error.html",response,request);
            }
            else{
                serve_files(absroute,response,request);
            }
        }
    }
    serve_files(absroute,response,request)
});


var fs = require('fs');
var mime = require('mime');
var page = undefined;


function serve_files(abs_route,response_,request){
    fs.readFile(abs_route, function(error, data) {
        if (error) {
            console.log(error);
        } else {
            page = data;
            write_page(response_,abs_route,data,request);
        }
    });
}

function write_page(_response, route_, page_content,request){
    _response.writeHead(200,{"content-type":mime.lookup(route_)});
    _response.end(page_content);
}


server.listen(4999, function() {
  console.log((new Date()) + " Server is listening on port 4999");
});

// create the server
wsServer = new WebSocketServer({
    httpServer: server
});

function sendCallback(err) {
    if (err) console.error("send() error: " + err);
}

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
    connection = request.accept(null, request.origin);
    clients[count] = connection;
    clients[count].send(JSON.stringify({"id" : count,
                                       "type": "id"}));
    count++;
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            try {
                signal = JSON.parse(message.utf8Data);
            }
            catch(e) {
                console.log(e.message);
            }
            if (signal["key"]) {
                if (roooms[signal["key"]]==undefined) {
                    var room = {};
                    conn_list = {};
                    conn_list["instructor"]=clients[signal["id"]]
                    room["status"] = "waiting";
                    room["connection"] = conn_list;
                    roooms[signal["key"]]=room;
                    clients[signal["id"]].send(JSON.stringify({"instructor":true,
                                                               "type":"confirmation",
                                                               "id":"instructor"}));
                }
                else if (roooms[signal["key"]]["status"]=="waiting"){
                    signal["destination"] = signal["id"];
                    roooms[signal["key"]]["connection"][signal["id"]] = clients[signal["id"]];
                    roooms[signal["key"]]["status"] = "connected";
                    for (var i in roooms[signal["key"]]["connection"]){
                        roooms[signal["key"]]["connection"][i].send(JSON.stringify(signal));
                    }
                }
                else if (roooms[signal["key"]]["status"] === "connected"){
                    if (roooms[signal["key"]]["connection"][signal["id"]]==undefined){
                        signal["destination"] = signal["id"];
                        roooms[signal["key"]]["connection"][signal["id"]]=clients[signal["id"]];
                        roooms[signal["key"]]["connection"]["instructor"].send(JSON.stringify(signal));
                        roooms[signal["key"]]["connection"][signal["id"]].send(JSON.stringify(signal));
                    }
                    else{
                        if (signal["id"] == "instructor"){
                            roooms[signal["key"]]["connection"][signal["destination"]].send(JSON.stringify(signal));
                        }
                        else if (signal["id"] != "instructor"){
                            roooms[signal["key"]]["connection"]["instructor"].send(JSON.stringify(signal));
                        }
                    }
                }
            }
        }
    });

    connection.on('close', function(connection){
        delete roooms[signal["key"]]["connection"][signal["id"]]
        console.log((new Date()) + " User has disconected.");

    });
});

