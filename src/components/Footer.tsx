import { Link, VStack, Text } from "@chakra-ui/react";

const Footer = () => (
  <VStack as="footer" alignItems="center" justify="center" spacing={4} mt={10}>
    <Text>
      The code for this is available on GitHub,{" "}
      <Link
        href="https://github.com/AnishDe12020/vaultacks"
        isExternal
        color="blue.400"
      >
        AnishDe12020/vaultacks
      </Link>
    </Text>
  </VStack>
);

export default Footer;
