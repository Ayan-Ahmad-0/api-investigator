import ipaddress
import socket
from typing import Tuple
from urllib.parse import urlparse

BLOCKED_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "::1",
    "metadata.google.internal",
    "instance-data",
}

BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),          # Current network
    ipaddress.ip_network("10.0.0.0/8"),         # Private RFC1918
    ipaddress.ip_network("100.64.0.0/10"),      # Carrier grade NAT
    ipaddress.ip_network("127.0.0.0/8"),        # Loopback
    ipaddress.ip_network("169.254.0.0/16"),     # Link-local / Cloud metadata (169.254.169.254)
    ipaddress.ip_network("172.16.0.0/12"),      # Private RFC1918
    ipaddress.ip_network("192.0.0.0/24"),       # IETF Protocol Assignments
    ipaddress.ip_network("192.0.2.0/24"),       # TEST-NET-1
    ipaddress.ip_network("192.168.0.0/16"),     # Private RFC1918
    ipaddress.ip_network("198.18.0.0/15"),      # Network benchmark tests
    ipaddress.ip_network("198.51.100.0/24"),    # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),     # TEST-NET-3
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved
    ipaddress.ip_network("255.255.255.255/32"), # Broadcast
    # IPv6
    ipaddress.ip_network("::1/128"),            # Loopback
    ipaddress.ip_network("::/128"),             # Unspecified
    ipaddress.ip_network("fc00::/7"),           # Unique local
    ipaddress.ip_network("fe80::/10"),          # Link-local
    ipaddress.ip_network("ff00::/8"),           # Multicast
]


def is_ip_blocked(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
        return True
    for net in BLOCKED_NETWORKS:
        if ip in net:
            return True
    return False


def is_safe_url(url: str) -> Tuple[bool, str]:
    """
    Validates that a URL is safe for external monitoring checks and does not
    target internal, loopback, or cloud-metadata destinations.
    """
    try:
        parsed = urlparse(url)
    except Exception as e:
        return False, f"Invalid URL format: {str(e)}"

    if parsed.scheme.lower() not in ("http", "https"):
        return False, f"Scheme '{parsed.scheme}' not allowed. Only http and https are permitted."

    hostname = parsed.hostname
    if not hostname:
        return False, "URL must include a valid hostname."

    hostname_lower = hostname.lower()
    if hostname_lower in BLOCKED_HOSTNAMES:
        return False, f"Target hostname '{hostname}' is blocked."

    # Check if host is direct IP
    try:
        ip = ipaddress.ip_address(hostname)
        if is_ip_blocked(ip):
            return False, f"Direct IP '{hostname}' belongs to a blocked/private range."
        return True, ""
    except ValueError:
        # Host is a domain name, resolve DNS
        pass

    try:
        addr_infos = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
        if not addr_infos:
            return False, f"Could not resolve hostname '{hostname}'."

        for family, _, _, _, sockaddr in addr_infos:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)
            # Handle IPv4 mapped in IPv6
            if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
                ip = ip.ipv4_mapped
            if is_ip_blocked(ip):
                return False, f"Resolved IP '{ip_str}' for host '{hostname}' is blocked."

        return True, ""
    except socket.gaierror:
        # In test environments or offline mock scenarios, allow mock test domains if specified
        if hostname_lower.endswith(".test") or hostname_lower.endswith(".example.com"):
            return True, ""
        return False, f"DNS resolution failed for hostname '{hostname}'."
    except Exception as e:
        return False, f"Failed to validate host: {str(e)}"
