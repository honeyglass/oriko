/**
 * Whether an address is one a download may connect to: a public unicast address.
 *
 * isPublic: true only for such an address; a host name or anything else is false.
 *
 * IPv6 is an allow-list: only global unicast, 2000::/3, passes, minus the blocks IANA's IPv6
 * special registry puts inside it. IPv4 has no such prefix, so its blocks are a definition from
 * IANA's IPv4 special-purpose registry and the multicast block; a mapped or embedded IPv4
 * address lies outside 2000::/3 and is refused.
 *
 * @example if (isPublic(address) === false) return rejected([privateAddress(url)]);
 */
import { BlockList, isIP } from 'node:net';

// https://www.iana.org/assignments/iana-ipv4-special-registry, plus 224.0.0.0/4 for multicast.
const SPECIAL_V4 = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.0.2.0/24',
  '192.31.196.0/24',
  '192.52.193.0/24',
  '192.88.99.0/24',
  '192.168.0.0/16',
  '192.175.48.0/24',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
];

// https://www.iana.org/assignments/iana-ipv6-special-registry: the blocks inside 2000::/3.
const SPECIAL_V6 = ['2001::/23', '2001:db8::/32', '2002::/16', '3fff::/20'];

const subnets = (blocks: string[], family: 'ipv4' | 'ipv6') => {
  const list = new BlockList();
  for (const block of blocks) {
    const [network = '', prefix = ''] = block.split('/');
    list.addSubnet(network, Number(prefix), family);
  }
  return list;
};

const specialV4 = subnets(SPECIAL_V4, 'ipv4');
const specialV6 = subnets(SPECIAL_V6, 'ipv6');
const globalV6 = subnets(['2000::/3'], 'ipv6');

/**
 * @param address - an IP address as a resolver or a URL gives it
 * @returns true for a public unicast address only
 */
export function isPublic(address: string) {
  switch (isIP(address)) {
    case 4:
      return specialV4.check(address, 'ipv4') === false;
    case 6:
      return globalV6.check(address, 'ipv6') && specialV6.check(address, 'ipv6') === false;
    default:
      return false;
  }
}
