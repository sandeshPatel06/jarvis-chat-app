import socket
import smtplib
from django.core.mail.backends.smtp import EmailBackend as DjangoEmailBackend

class IPv4SMTP(smtplib.SMTP):
    def _get_socket(self, host, port, timeout):
        return self._create_socket_ipv4(host, port, timeout, use_ssl=False)

    def _create_socket_ipv4(self, host, port, timeout, use_ssl=False):
        print(f"IPv4SMTP(SSL={use_ssl}): Attempting to connect to {host}:{port} enforcing IPv4...", flush=True)
        
        last_exception = None
        # Force IPv4 resolution (AF_INET)
        # We get all valid addresses
        try:
            infos = socket.getaddrinfo(host, port, family=socket.AF_INET, type=socket.SOCK_STREAM)
        except Exception as e:
             print(f"IPv4SMTP: Resolution failed: {e}", flush=True)
             raise

        if not infos:
            raise OSError("No IPv4 addresses found for " + host)

        for res in infos:
            af, socktype, proto, canonname, sa = res
            ip_address = sa[0]
            print(f"IPv4SMTP: Trying {ip_address}...", flush=True)
            try:
                sock = socket.socket(af, socktype, proto)
                if timeout is not None:
                    sock.settimeout(timeout)
                if self.source_address:
                    sock.bind(self.source_address)
                
                sock.connect(sa)
                
                if use_ssl:
                    # Wrap with SSL context
                    # self._host should be available in instance (set by SMTP init)
                    server_hostname = getattr(self, '_host', host)
                    sock = self.context.wrap_socket(sock, server_hostname=server_hostname)
                
                print(f"IPv4SMTP: Connected to {ip_address}", flush=True)
                return sock
                
            except Exception as e:
                print(f"IPv4SMTP: Failed to connect to {ip_address}: {e}", flush=True)
                last_exception = e
                if sock:
                    sock.close()

        print("IPv4SMTP: All IPv4 connection attempts failed.", flush=True)
        if last_exception:
            raise last_exception
        raise OSError("Failed to connect to any IPv4 address for " + host)

class IPv4SMTP_SSL(smtplib.SMTP_SSL):
    def _get_socket(self, host, port, timeout):
        # Delegate to the shared helper logic, forcing SSL
        # We need to access the helper method which I defined in IPv4SMTP
        # To avoid multiple inheritance issues, I'll just duplicate or put it in a mixin.
        # Duplicating small logic is safer for this hotfix.
        
        print(f"IPv4SMTP_SSL: Attempting to connect to {host}:{port} enforcing IPv4...", flush=True)
        
        last_exception = None
        try:
            infos = socket.getaddrinfo(host, port, family=socket.AF_INET, type=socket.SOCK_STREAM)
        except Exception as e:
             print(f"IPv4SMTP_SSL: Resolution failed: {e}", flush=True)
             raise

        if not infos:
            raise OSError("No IPv4 addresses found for " + host)

        for res in infos:
            af, socktype, proto, canonname, sa = res
            ip_address = sa[0]
            print(f"IPv4SMTP_SSL: Trying {ip_address}...", flush=True)
            try:
                sock = socket.socket(af, socktype, proto)
                if timeout is not None:
                    sock.settimeout(timeout)
                if self.source_address:
                    sock.bind(self.source_address)
                
                # Connect
                sock.connect(sa)
                
                # WRAP SSL
                # smtp.gmail.com requires check_hostname=True typically, and self.context has it.
                # we must pass server_hostname matching the DOMAIN, not the IP.
                # 'self._host' is set by SMTP.__init__ to the initial host argument.
                server_hostname = getattr(self, '_host', host)
                sock = self.context.wrap_socket(sock, server_hostname=server_hostname)
                
                print(f"IPv4SMTP_SSL: Connected to {ip_address}", flush=True)
                return sock
                
            except Exception as e:
                print(f"IPv4SMTP_SSL: Failed to connect to {ip_address}: {e}", flush=True)
                last_exception = e
                if sock:
                    sock.close()

        print("IPv4SMTP_SSL: All IPv4 connection attempts failed.", flush=True)
        if last_exception:
            raise last_exception
        raise OSError("Failed to connect to any IPv4 address for " + host)


class EmailBackend(DjangoEmailBackend):
    @property
    def connection_class(self):
        if self.use_ssl:
            return IPv4SMTP_SSL
        return IPv4SMTP
