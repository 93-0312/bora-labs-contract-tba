import { AbiCoder } from "ethers";
import { ethers } from "hardhat";

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
}

export default Util;
