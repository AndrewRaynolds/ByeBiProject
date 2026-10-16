import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { lookup, request } = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ default: { lookup } }));
vi.mock("node:http", () => ({ default: { request } }));
vi.mock("node:https", () => ({ default: { request } }));
import { previewTripLink } from "./tripLinkPreview";

type Page = { body?: string; status?: number; location?: string; contentType?: string; silent?: boolean };
let pages: Page[];
beforeEach(() => {
  pages=[];lookup.mockReset();request.mockReset();lookup.mockResolvedValue([{address:"8.8.8.8",family:4}]);
  request.mockImplementation((_url, _options, callback) => {
    const page=pages.shift() ?? {};
    const req=Object.assign(new EventEmitter(),{
      end:()=>queueMicrotask(()=>{
        if(page.silent)return;
        const response=Object.assign(new EventEmitter(),{statusCode:page.status??200,
          headers:{"content-type":page.contentType??"text/html",location:page.location},resume:vi.fn(),destroy:vi.fn()});
        callback(response);
        if(page.body)response.emit("data",Buffer.from(page.body));
        response.emit("end");req.emit("close");
      }),
      destroy:(error:Error)=>{req.emit("error",error);req.emit("close");},
    });return req;
  });
});
afterEach(()=>vi.useRealTimers());
describe("preview transport safety with simulated DNS and HTTP",()=>{
 it("resolves relative metadata against the final validated redirect and pins public DNS",async()=>{
  pages=[{status:302,location:"https://other.example.com/rooms/hotel"},{body:'<meta property="og:image:url" content="../photo.jpg">'}];
  expect(await previewTripLink("https://example.com/hotel")).toMatchObject({url:"https://other.example.com/rooms/hotel",imageUrl:"https://other.example.com/photo.jpg"});
  expect(lookup).toHaveBeenCalledTimes(2);expect(request).toHaveBeenCalledTimes(2);
  const options=request.mock.calls[1][1];const callback=vi.fn();options.lookup("other.example.com",{},callback);expect(callback).toHaveBeenCalledWith(null,"8.8.8.8",4);
 });
 it("refuses a redirect resolving to a private network before a second HTTP request",async()=>{
  pages=[{status:302,location:"https://private.example.com/image"}];lookup.mockResolvedValueOnce([{address:"8.8.8.8",family:4}]).mockResolvedValueOnce([{address:"10.0.0.1",family:4}]);
  expect(await previewTripLink("https://example.com/hotel")).toMatchObject({available:false,imageUrl:null});expect(request).toHaveBeenCalledTimes(1);
 });
 it("refuses a mixed public/private DNS answer",async()=>{
  lookup.mockResolvedValue([{address:"8.8.8.8",family:4},{address:"192.168.0.1",family:4}]);
  expect((await previewTripLink("https://example.com/hotel")).available).toBe(false);expect(request).not.toHaveBeenCalled();
 });
 it("bounds redirect loops to three requests",async()=>{
  pages=Array.from({length:3},()=>({status:302,location:"https://example.com/again"}));
  expect((await previewTripLink("https://example.com/hotel")).available).toBe(false);expect(request).toHaveBeenCalledTimes(3);
 });
 it("returns the manual fallback after the request timeout",async()=>{
  vi.useFakeTimers();pages=[{silent:true}];const pending=previewTripLink("https://example.com/hotel");
  await vi.advanceTimersByTimeAsync(5000);expect(await pending).toMatchObject({available:false,imageUrl:null});
 });
 it.each([{status:403,body:"blocked"},{contentType:"image/jpeg",body:"not HTML"}])("does not bypass a denied/non-HTML response %#",async page=>{
  pages=[page];expect(await previewTripLink("https://example.com/hotel")).toMatchObject({available:false,imageUrl:null});
 });
 it("retains bounded prefix metadata on an oversized page and does not request the image",async()=>{
  pages=[{body:'<meta property="og:image" content="/actual.jpg">'+' '.repeat(262144)+'<meta property="og:title" content="Outside prefix">'}];
  expect(await previewTripLink("https://example.com/hotel")).toMatchObject({title:"example.com",imageUrl:"https://example.com/actual.jpg"});expect(request).toHaveBeenCalledTimes(1);
 });
});
