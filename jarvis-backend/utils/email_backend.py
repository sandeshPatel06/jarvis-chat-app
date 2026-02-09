import socket
import smtplib
from django.core.mail.backends.smtp import EmailBackend as DjangoEmailBackend

class IPv4SMTP(smtplib.SMTP):
    def _get_socket(self, host, port, timeout):
        """
        Overrides the internal _get_socket method to force IPv4 resolution.
        We resolve the hostname to an IPv4 address manually using AF_INET,
        then pass that IP to socket.create_connection.
        
        Note: The self._host attribute in smtplib.SMTP (used for SNI/SSL checks)
        is set in the connect() method to the original hostname, so connecting
        via IP here doesn't break SSL verification as long as we don't mess up
        the upstream logic.
        """
        print(f"IPv4SMTP: Attempting to connect to {host}:{port} enforcing IPv4...", flush=True)
        try:
            # Force IPv4 resolution (AF_INET)
            infos = socket.getaddrinfo(host, port, family=socket.AF_INET, type=socket.SOCK_STREAM)
            if infos:
                # Use the first IPv4 address found
                address_to_use = infos[0][4] # (ip, port)
                ip_address = address_to_use[0]
                
                print(f"IPv4SMTP: Resolved {host} to {ip_address}. Connecting...", flush=True)
                
                # Create connection using the IP address
                return socket.create_connection((ip_address, port), timeout, self.source_address)
            else:
                print(f"IPv4SMTP: No IPv4 address found for {host}. creating connection with default behavior.", flush=True)

        except Exception as e:
            print(f"IPv4SMTP: Error during IPv4 resolution/connection: {e}. Falling back to default.", flush=True)

        return super()._get_socket(host, port, timeout)

class EmailBackend(DjangoEmailBackend):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Override the connection class to use our IPv4-forcing version
        # We only do this if it's currently the default smtplib.SMTP
        # to avoid conflicting with other custom connection classes if any were passed.
        if self.connection_class == smtplib.SMTP:
            self.connection_class = IPv4SMTP
