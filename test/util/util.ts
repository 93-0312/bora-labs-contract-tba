import { AbiCoder } from "ethers";
import { ethers, network } from "hardhat";
import { BigNumberish, Interface } from "ethers";
import {
  BoralabsTBA721,
  BoralabsTBA1155,
  BoralabsTBA6551Account,
  BoralabsTBA6551Registry,
} from "../typechain-types";

class Util {
  static abi = new AbiCoder();

  static decodeFunctionResult(resultType: Array<string>, data: string) {
    let dataArr = Util.abi.decode(resultType, data).toArray();
    let result: any[] = [];
    dataArr.forEach(function (value) {
      if (ethers.isHexString(value)) {
        result.push(ethers.toUtf8String(value));
      } else {
        result.push(value);
      }
    });
    return result;
  }

  static toBoolean(number: Number) {
    return number != 0;
  }

  static async mintMulti721(
    mintTo: string,
    mintTimes: number,
    contract: BoralabsTBA721
  ) {
    const availableMintNum = await contract.availableMintNum();
    let tokenIds = [];
    const mintBand = 10000000;
    for (let i = 0; i < mintTimes; ++i) {
      tokenIds.push(mintBand + Number(availableMintNum) + i);
      tokenIds.push(mintBand * 2 + Number(availableMintNum) + i);
      tokenIds.push(mintBand * 3 + Number(availableMintNum) + i);
      await contract.tbaMint(mintTo);
    }
    return tokenIds;
  }

  static async executeMintMulti721(
    tba: BoralabsTBA6551Account,
    mintTo: string,
    mintTimes: number,
    contract: BoralabsTBA721
  ) {
    const availableMintNum = await contract.availableMintNum();
    let tokenIds = [];
    const mintBand = 10000000;
    const iface721 = new Interface(["function tbaMint( address to )"]);
    let data = iface721.encodeFunctionData("tbaMint", [mintTo]);

    for (let i = 0; i < mintTimes; ++i) {
      tokenIds.push(mintBand + Number(availableMintNum) + i);
      tokenIds.push(mintBand * 2 + Number(availableMintNum) + i);
      tokenIds.push(mintBand * 3 + Number(availableMintNum) + i);
      await tba.execute(await contract.getAddress(), 0, data, 0);
    }
    return tokenIds;
  }

  static async executeMintMulti1155(
    tba: BoralabsTBA6551Account,
    mintTo: string,
    amount: number,
    mintData: any,
    mintTimes: number,
    contract: BoralabsTBA1155
  ) {
    const availableMintNum = await contract.availableMintNum();
    let tokenIds = [];
    const mintBand = 10000000;
    const iface1155 = new Interface([
      "function tbaMint(address to, uint256 amount, bytes memory data)",
    ]);
    let data = iface1155.encodeFunctionData("tbaMint", [
      mintTo,
      amount,
      mintData,
    ]);

    for (let i = 0; i < mintTimes; ++i) {
      tokenIds.push(mintBand + Number(availableMintNum) + i);
      tokenIds.push(mintBand * 2 + Number(availableMintNum) + i);
      tokenIds.push(mintBand * 3 + Number(availableMintNum) + i);
      tokenIds.push(mintBand * 4 + Number(availableMintNum) + i);
      tokenIds.push(mintBand * 5 + Number(availableMintNum) + i);
      await tba.execute(await contract.getAddress(), 0, data, 0);
    }
    return tokenIds;
  }

  static async mintMulti721ForMultiUser(
    mintTo: any[],
    mintTimes: number,
    contract: BoralabsTBA721
  ) {
    for (let i = 0; i < mintTo.length; ++i) {
      this.mintMulti721(mintTo[i], mintTimes, contract);
    }
  }

  static createMultiUser(numOfUsers: number) {
    const signers = [];
    for (let i = 0; i < numOfUsers; i++) {
      let wallet = ethers.Wallet.createRandom();
      wallet = wallet.connect(ethers.provider);
      signers.push(wallet);
    }
    return signers;
  }

  static async createMultiTBA(
    implementAddress: string,
    registry: BoralabsTBA6551Registry,
    tokenAddress: string,
    numOfAccount: number,
    tokenIds: any[],
    salt: number
  ) {
    const chainId = network.config.chainId as BigNumberish;
    for (let i = 0; i < numOfAccount; ++i) {
      await registry.createAccount(
        implementAddress,
        chainId,
        tokenAddress,
        tokenIds[i],
        salt,
        "0x"
      );
    }
  }

  static async getTotalTBA(
    tokenIds: number[],
    contract721: BoralabsTBA721,
    contractRegistry: BoralabsTBA6551Registry
  ) {
    let result = 0;
    for (let i = 0; i < tokenIds.length; ++i) {
      const accountsOfToken = (
        await contractRegistry.accountsOf(contract721, tokenIds[i])
      ).length;
      result += accountsOfToken;
    }
    return result;
  }

  static showProgress(current: number, max: number) {
    let percent = Math.floor((current / max) * 100);
    let barContent = "";
    for (let i = 1; i <= 100; i++) {
      if (i <= percent) {
        barContent += "=";
      } else {
        barContent += " ";
      }
    }
    let bar =
      "Progress [" +
      barContent +
      "] " +
      percent +
      "%" +
      " (" +
      current +
      "/" +
      max +
      ")" +
      " complete... \r";
    process.stdout.write(bar);
  }
  static clearProgress() {
    process.stdout.write("\r\x1b[K");
  }
}

export default Util;
