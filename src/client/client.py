import socket
import sys
sys.path.insert(0, '../')
from mlp_network_protocol import send as proto_send, recv as proto_recv


class client:
    def __init__(self, ip: str, port: int):
        self.ip = ip
        self.port = port
        self.mySocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    def connect(self):
        self.mySocket.connect((self.ip, self.port))

    def send_command(self, cmd: str) -> str:
        ok = proto_send(cmd, self.mySocket)
        if not ok:
            return ""

        return proto_recv(self.mySocket)

    def run(self):
        while True:
            try:
                message_client = input("CLIENT> ")
            except EOFError:
                break

            try:
                response = self.send_command(message_client)
            except ConnectionAbortedError as e:
                break

            print(response)

    def close(self):
        self.mySocket.close()


def main():
    if len(sys.argv) != 3:
        return

    ip = sys.argv[1]
    try:
        port = int(sys.argv[2])
    except ValueError:
        return

    c = client(ip, port)

    # ⚠️ IMPORTANT: no try/except here for now – we WANT to see errors
    c.connect()
    c.run()
    c.close()


if __name__ == "__main__":
    main()
