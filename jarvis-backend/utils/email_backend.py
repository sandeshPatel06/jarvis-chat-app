import socket
import smtplib
from django.core.mail.backends.smtp import EmailBackend as DjangoEmailBackend

class IPv4SMTP(smtplib.SMTP):
    def _get_socket(self, host, port, timeout):
        print(f"IPv4SMTP: Attempting to connect to {host}:{port} enforcing IPv4...", flush=True)
        try:
            # Force IPv4 resolution (AF_INET)
            infos = socket.getaddrinfo(host, port, family=socket.AF_INET, type=socket.SOCK_STREAM)
            if infos:
                address_to_use = infos[0][4] # (ip, port)
                ip_address = address_to_use[0]
                print(f"IPv4SMTP: Resolved {host} to {ip_address}. Connecting...", flush=True)
                return socket.create_connection((ip_address, port), timeout, self.source_address)
            else:
                print(f"IPv4SMTP: No IPv4 address found for {host}. creating connection with default behavior.", flush=True)
        except Exception as e:
             print(f"IPv4SMTP: Error during IPv4 resolution/connection: {e}. Falling back to default.", flush=True)

        return super()._get_socket(host, port, timeout)

class IPv4SMTP_SSL(smtplib.SMTP_SSL):
    def _get_socket(self, host, port, timeout):
        print(f"IPv4SMTP_SSL: Attempting to connect to {host}:{port} enforcing IPv4...", flush=True)
        try:
            infos = socket.getaddrinfo(host, port, family=socket.AF_INET, type=socket.SOCK_STREAM)
            if infos:
                address_to_use = infos[0][4]
                ip_address = address_to_use[0]
                print(f"IPv4SMTP_SSL: Resolved {host} to {ip_address}. Connecting with SSL...", flush=True)
                
                # We need to manually duplicate SMTP_SSL._get_socket logic but with IP,
                # ensuring we wrap it with the SSL context.
                new_socket = socket.create_connection((ip_address, port), timeout, self.source_address)
                new_socket = self.context.wrap_socket(new_socket, server_hostname=self._host)
                return new_socket
            else:
                print(f"IPv4SMTP_SSL: No IPv4 address found for {host}.", flush=True)
        except Exception as e:
            print(f"IPv4SMTP_SSL: Error during IPv4 SSL resolution/connection: {e}. Falling back to default.", flush=True)
            import traceback
            traceback.print_exc()

        return super()._get_socket(host, port, timeout)


class EmailBackend(DjangoEmailBackend):
    @property
    def connection_class(self):
        if self.use_ssl:
            return IPv4SMTP_SSL
        return IPv4SMTP
