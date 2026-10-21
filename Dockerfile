FROM gcc:latest

RUN apt-get update && apt-get install -y cmake && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/mytest

COPY . .

ENV FILES_DIR=/usr/src/mytest/files

RUN mkdir -p files build

WORKDIR /usr/src/mytest/build

RUN cmake .. && make

CMD ["./runTests"]
