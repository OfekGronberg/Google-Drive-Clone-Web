import socket
def recv(sock):
    got = '0'
    length = ""
    try:
        while got != ' ' and got != '':
            got = sock.recv(1).decode()
            if got.isdigit():
                length += got
        length = int(length)
        result = ""
        while length > 0:
            got = sock.recv(length).decode()
            if len(got) == 0:
                raise ConnectionAbortedError
            length -= len(got)
            result += got
        return result
    except Exception:
        raise ConnectionAbortedError

def send(message, sock):
    message = (str(len(message)) + ' ' + message).encode()
    sent = 0
    try:
        while sent < len(message):
            sent += sock.send(message[sent:])
    except Exception:
        return False
    return True
