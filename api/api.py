# ToDo: dont forget to convert money from float to int and back
from http import HTTPStatus
from fastapi import FastAPI
import uvicorn
import common
import asyncio
import grpc
import logging

from protobufs import omniscient_pb2, omniscient_pb2_grpc
from protobufs import smartlife_pb2, smartlife_pb2_grpc

app = FastAPI()
API_SECRET = common.api_secret
excluded_endpoints = ["/", "/health"]

def log_filter(record: logging.LogRecord) -> bool:
    return record.args is not None and len(record.args) > 2 and record.args[2] not in excluded_endpoints


@app.get("/")
@app.get("/health")
def health():
    return {"message": "Ok"}


@app.get("/add_payment/{secret}/{store}/{amount}")
def add_payment(secret: str, store: str, amount: str):
    if secret != API_SECRET:
        return HTTPStatus(403)

    # strip amount into int
    amount_cleaned = amount.replace("\xa0€", "")  # delete extras
    amount_numerical = int(float(amount_cleaned.replace(',', '.')) * 100)

    payment = omniscient_pb2.Payment(store=store, amount=amount_numerical)
    resp = add_payment_stub.AddPayment(payment)

    return HTTPStatus(200)


@app.get("/query/{secret}/{start_date}/{stop_date}")
def query(secret: str, start_date: str, stop_date: str):
    if secret != API_SECRET:
        return HTTPStatus(403)

    date_query = omniscient_pb2.DateQuery(start_date=start_date, stop_date=stop_date)
    resp = query_stub.Query(date_query)
    print(f"Received {resp} as database query response")


    return {"total": resp.amount/100}

@app.get("/updStatus/{secret}/{new_status}")
def updStatus(secret, new_status: bool):
    if secret != API_SECRET:
        return HTTPStatus(403)

    status_request = smartlife_pb2.StatusRequest(status=new_status)
    resp = smartlife_stub.StatusUpdate(status_request)

    return HTTPStatus(200)

@app.get("/updActive/{secret}/{new_active}")
def updActive(secret, new_active: bool):
    if secret != API_SECRET:
        return HTTPStatus(403)

    active_request = smartlife_pb2.ActiveRequest(active=new_active)
    resp = smartlife_stub.ActiveUpdate(active_request)

    return HTTPStatus(200)


@app.get("/updBrightness/{secret}/{new_brightness}")
def updBrightness(secret, new_brightness: int):
    if secret != API_SECRET:
        return HTTPStatus(403)

    brightness_request = smartlife_pb2.BrightnessRequest(brightness=new_brightness)
    resp = smartlife_stub.BrightnessUpdate(brightness_request)

    return HTTPStatus(200)



# ToDo: add ssl (consult Config())
async def runREST():
    config = uvicorn.config.Config(host="0.0.0.0", port=5006, app=app)
    server = uvicorn.Server(config)
    logging.getLogger("uvicorn.access").addFilter(log_filter)
    await server.serve()

# utility func to run different coroutines (should have done this in Golang lmao)
async def main():
    await asyncio.gather(runREST())

if __name__ == "__main__":
    # init rpc
    omniscient_channel = grpc.insecure_channel(target="omniscient:5003")
    smartlife_channel = grpc.insecure_channel(target="smartlife:5002")
    print("RPC channels initialized")

    # create stubs
    add_payment_stub = omniscient_pb2_grpc.AddPaymentStub(channel=omniscient_channel)
    query_stub = omniscient_pb2_grpc.QueryStub(channel=omniscient_channel)
    smartlife_stub = smartlife_pb2_grpc.StateUpdateStub(channel=smartlife_channel)
    print("RPC stubs initialized")

    # run rest api in a non-blocking fashion (we can also block tbh, there's not much shit to give)
    asyncio.run(main())