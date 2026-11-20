import { appendFileSync } from "node:fs";
const LOG = process.argv[3];
const sse=(e:string,d:unknown)=>`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`;
const M={id:"msg_p",type:"message",role:"assistant",content:[],stop_reason:null,stop_sequence:null,usage:{input_tokens:10,output_tokens:5},model:"x"};
Bun.serve({port:Number(process.argv[2]),async fetch(req){
 const u=new URL(req.url); const t=await req.text();
 appendFileSync(LOG, JSON.stringify({t:Date.now(),method:req.method,path:u.pathname,body:t})+"\n");
 if(u.pathname.startsWith("/v1/messages/count_tokens")) return Response.json({input_tokens:10});
 if(!u.pathname.startsWith("/v1/messages")) return Response.json({});
 let b:any={}; try{b=JSON.parse(t)}catch{}
 const body = sse("message_start",{type:"message_start",message:M})+sse("content_block_start",{type:"content_block_start",index:0,content_block:{type:"text",text:""}})+sse("content_block_delta",{type:"content_block_delta",index:0,delta:{type:"text_delta",text:"OK"}})+sse("content_block_stop",{type:"content_block_stop",index:0})+sse("message_delta",{type:"message_delta",delta:{stop_reason:"end_turn",stop_sequence:null},usage:{output_tokens:5}})+sse("message_stop",{type:"message_stop"});
 if(b.stream===false) return Response.json({...M,content:[{type:"text",text:"OK"}],stop_reason:"end_turn"});
 return new Response(body,{headers:{"content-type":"text/event-stream"}});
}});
