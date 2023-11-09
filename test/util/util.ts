import { AbiCoder, TransactionReceipt } from "ethers";
import { ethers, network } from "hardhat";
import { BigNumberish, Interface } from "ethers";
import {
  BoralabsTBA721,
  BoralabsTBA1155,
  BoralabsTBA6551Account,
  BoralabsTBA6551Registry,
  BoralabsTBA20,
} from "../../typechain-types";

export class Util {
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

  static calcTransactionFee(receipt: TransactionReceipt) {
    const gasPrice = receipt?.gasPrice;
    const gasUsed = receipt?.gasUsed;
    const transactionFee = gasPrice * gasUsed;

    return transactionFee;
  }

  static async multiMint721(
    erc721Contract: BoralabsTBA721,
    to: string,
    times: number
  ) {
    const availableMintNum = Number(await erc721Contract.availableMintNum());
    const mintBand = Number(await erc721Contract.mintBand());
    let tokenIds = [];
    for (let i = 0; i < times; ++i) {
      tokenIds.push(mintBand + availableMintNum + i);
      tokenIds.push(mintBand * 2 + availableMintNum + i);
      tokenIds.push(mintBand * 3 + availableMintNum + i);
      await erc721Contract.tbaMint(to);
      Util.showProgress(ProcessName.MINT, i + 1, times);
    }
    Util.clearProgress();
    return tokenIds;
  }

  static async multiMint1155(
    erc1155Contract: BoralabsTBA1155,
    to: string,
    amount: number,
    data: any,
    times: number
  ) {
    const availableMintNum = Number(await erc1155Contract.availableMintNum());
    const mintBand = Number(await erc1155Contract.mintBand());
    let tokenIds = [];

    for (let i = 0; i < times; ++i) {
      tokenIds.push(mintBand + availableMintNum + i);
      tokenIds.push(mintBand * 2 + availableMintNum + i);
      tokenIds.push(mintBand * 3 + availableMintNum + i);
      tokenIds.push(mintBand * 4 + availableMintNum + i);
      tokenIds.push(mintBand * 5 + availableMintNum + i);
      await erc1155Contract.tbaMint(to, amount, data);
      Util.showProgress(ProcessName.MINT, i + 1, times);
    }
    Util.clearProgress();
    return tokenIds;
  }

  static async multiExecuteMint721(
    accountContract: BoralabsTBA6551Account,
    to: string,
    times: number,
    erc721Contract: BoralabsTBA721
  ) {
    const availableMintNum = Number(await erc721Contract.availableMintNum());
    const mintBand = Number(await erc721Contract.mintBand());
    let tokenIds = [];

    const iface721 = new Interface(["function tbaMint( address to )"]);
    let data = iface721.encodeFunctionData("tbaMint", [to]);

    for (let i = 0; i < times; ++i) {
      tokenIds.push(mintBand + availableMintNum + i);
      tokenIds.push(mintBand * 2 + availableMintNum + i);
      tokenIds.push(mintBand * 3 + availableMintNum + i);
      await accountContract.execute(
        await erc721Contract.getAddress(),
        0,
        data,
        0
      );
      Util.showProgress(ProcessName.MINT, i + 1, times);
    }
    Util.clearProgress();

    return tokenIds;
  }

  static async multiExecuteMint1155(
    accountContract: BoralabsTBA6551Account,
    to: string,
    amount: number,
    data: any,
    times: number,
    erc1155Contract: BoralabsTBA1155
  ) {
    const availableMintNum = Number(await erc1155Contract.availableMintNum());
    const mintBand = Number(await erc1155Contract.mintBand());
    let tokenIds = [];

    const iface1155 = new Interface([
      "function tbaMint(address to, uint256 amount, bytes memory data)",
    ]);
    data = iface1155.encodeFunctionData("tbaMint", [to, amount, data]);

    for (let i = 0; i < times; ++i) {
      tokenIds.push(mintBand + availableMintNum + i);
      tokenIds.push(mintBand * 2 + availableMintNum + i);
      tokenIds.push(mintBand * 3 + availableMintNum + i);
      tokenIds.push(mintBand * 4 + availableMintNum + i);
      tokenIds.push(mintBand * 5 + availableMintNum + i);
      await accountContract.execute(
        await erc1155Contract.getAddress(),
        0,
        data,
        0
      );
      Util.showProgress(ProcessName.MINT, i + 1, times);
    }
    Util.clearProgress();
    return tokenIds;
  }

  static async multiMint721ForMultiUser(
    mintTo: any[],
    mintTimes: number,
    contract: BoralabsTBA721
  ) {
    let tokenIds: number[][] = [];
    for (let i = 0; i < mintTo.length; ++i) {
      const tokenId = await this.multiMint721(contract, mintTo[i], mintTimes);
      tokenIds.push(tokenId);
    }
    return tokenIds;
  }

  static async createUsers(numOfUsers: number) {
    const signers = [];
    const users = await ethers.getSigners();
    for (let i = 0; i < numOfUsers; i++) {
      let wallet = ethers.Wallet.createRandom();
      wallet = wallet.connect(ethers.provider);
      await users[0].sendTransaction({
        to: wallet.address,
        value: ethers.parseEther("1"),
      });
      signers.push(wallet);
    }
    return signers;
  }

  static async createTBAs(
    implementAddress: string,
    registry: BoralabsTBA6551Registry,
    tokenAddress: string,
    tokenIds: any[],
    salt: number,
    tbaOwner: any
  ) {
    let tbaAddresses: string[] = [];
    let tbaContracts: BoralabsTBA6551Account[] = [];
    const chainId = network.config.chainId as BigNumberish;
    for (let i = 0; i < tokenIds.length; ++i) {
      await registry
        .connect(tbaOwner)
        .createAccount(
          implementAddress,
          chainId,
          tokenAddress,
          tokenIds[i],
          salt,
          "0x"
        );
      const tbaAddress = await registry.accountsOf(tokenAddress, tokenIds[i]);
      tbaAddresses.push(...tbaAddress);

      const tbaContract = await ethers.getContractAt(
        "BoralabsTBA6551Account",
        tbaAddress[0]
      );
      tbaContracts.push(tbaContract);
    }
    return [tbaAddresses, tbaContracts];
  }

  static async countTotalTBA(
    tokenIds: number[],
    erc721Contract: BoralabsTBA721,
    registryContract: BoralabsTBA6551Registry
  ) {
    let count = 0;
    for (let i = 0; i < tokenIds.length; ++i) {
      const accountsOfToken = (
        await registryContract.accountsOf(erc721Contract, tokenIds[i])
      ).length;
      count += accountsOfToken;
    }
    return count;
  }

  static async totalBalanceERC20(
    erc20Contract: BoralabsTBA20,
    tbaAccounts: string[]
  ) {
    let balance = 0;
    for (let i = 0; i < tbaAccounts.length; ++i) {
      balance += Number(await erc20Contract.balanceOf(tbaAccounts[i]));
    }
    return balance;
  }

  static async totalBalanceERC721(
    erc721Contract: BoralabsTBA721,
    tbaAccounts: string[]
  ) {
    let balance = 0;
    for (let i = 0; i < tbaAccounts.length; ++i) {
      balance += Number(await erc721Contract.balanceOf(tbaAccounts[i]));
    }
    return balance;
  }

  static async totalBalanceERC1155(
    erc1155Contract: BoralabsTBA1155,
    tbaAccounts: string[]
  ) {
    let balance = 0;
    for (let i = 0; i < tbaAccounts.length; ++i) {
      balance += Number(await erc1155Contract.tokenCountOf(tbaAccounts[i]));
    }
    return balance;
  }

  static showProgress(name: string, current: number, max: number) {
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
      "Progress: " +
      name +
      ` [${barContent}]` +
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

export enum ProcessName {
  MINT = "Mint",
  BURN = "Burn",
  TRANSFER = "Transfer",
  CREATE_TBA = "Create TBA",
  VERIFY_BALANCE = "Verify balance",
}

export default Util;
