import type { NextPage } from "next";
import React, { useState } from "react";
import * as encoding from "@walletconnect/encoding";
import Blockchain from "./../components/Blockchain";
import Header from "./../components/Header";
import Modal from "./../components/Modal";
import {
  AccountAction,
  hashPersonalMessage,
  verifySignature,
} from "./../helpers";
import RequestModal from "./../modals/RequestModal";
import {
  SAccounts,
  SAccountsContainer,
  SButtonContainer,
  SContent,
  SLanding,
  SLayout,
} from "./../components/app";
import { useWalletConnectClient } from "./../contexts/ClientContext";
import { RELAYER_SDK_VERSION as version } from "@walletconnect/core";
interface IFormattedRpcResponse {
  method: string;
  address: string;
  valid: boolean;
  result: string;
}

const Home: NextPage = () => {
  const [isRpcRequestPending, setIsRpcRequestPending] = useState(false);
  const [rpcResult, setRpcResult] = useState<IFormattedRpcResponse | null>();

  const [modal, setModal] = useState("");

  const closeModal = () => setModal("");
  const openRequestModal = () => setModal("request");

  // Initialize the WalletConnect client.
  const {
    client,
    session,
    disconnect,
    chain,
    accounts,
    balances,
    chainData,
    isFetchingBalances,
    isInitializing,
    connect,
    web3Provider,
  } = useWalletConnectClient();

  const testSignMessage: () => Promise<IFormattedRpcResponse> = async () => {
    if (!web3Provider) {
      throw new Error("web3Provider not connected");
    }

    const msg = "hello world";
    const hexMsg = encoding.utf8ToHex(msg, true);
    const [address] = await web3Provider.listAccounts();
    const signature = await web3Provider.send("personal_sign", [hexMsg, address]);
    const hashMsg = hashPersonalMessage(msg)
    const valid = await verifySignature(address, signature, hashMsg, web3Provider);
    return {
      method: "personal_sign",
      address,
      valid,
      result: signature,
    };
  };

  const getEthereumActions = (): AccountAction[] => {
    const wrapRpcRequest = (rpcRequest: () => Promise<IFormattedRpcResponse>) => async () => {
      openRequestModal();
      try {
        setIsRpcRequestPending(true);
        const result = await rpcRequest();
        setRpcResult(result);
      } catch (error) {
        console.error("RPC request failed:", error);
        setRpcResult(null);
      } finally {
        setIsRpcRequestPending(false);
      }
    };
    return [
      { method: "personal_sign", callback: wrapRpcRequest(testSignMessage) },
    ];
  };

  const renderContent = () => {
    return !accounts.length && !Object.keys(balances).length ? (
      <SLanding center>
        <SButtonContainer>
            <Blockchain key={"eip155:1"} chainId={"eip155:1"} chainData={chainData} onClick={connect} />
        </SButtonContainer>
      </SLanding>
    ) : (
      <SAccountsContainer>
        <h3>Account</h3>
        <SAccounts>
          {accounts.map(account => {
            return (
              <Blockchain
                key={account}
                active={true}
                chainData={chainData}
                fetching={isFetchingBalances}
                address={account}
                chainId={chain}
                balances={balances}
                actions={getEthereumActions()}
              />
            );
          })}
        </SAccounts>
      </SAccountsContainer>
    );
  };

  return (
    <SLayout>
        <Header disconnect={disconnect} session={session} />
        <SContent>{isInitializing ? "Loading..." : renderContent()}</SContent>
      <Modal show={!!modal} closeModal={closeModal}>
        <RequestModal pending={isRpcRequestPending} result={rpcResult} />
      </Modal>
    </SLayout>
  );
};

export default Home;
