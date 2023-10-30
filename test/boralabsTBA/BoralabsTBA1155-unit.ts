import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  BoralabsTBA721,
  BoralabsTBA1155,
  BoralabsTBA6551Account,
  BoralabsTBA6551Registry,
} from "../typechain-types";
import {
  deployBora721,
  deployBora1155,
  deployBora6551Account,
  deployBora6551Registry,
} from "../util/fixture";
import mlog from "../util/mlog";
import { BigNumberish, Interface } from "ethers";
import Util from "../util/util";

describe("BoralabsTBA6551: Unit test", function () {
  mlog.injectLogger(this);

  let bora721: BoralabsTBA721;
  let bora1155: BoralabsTBA1155;
  let bora6551Account: BoralabsTBA6551Account;
  let bora6551Registry: BoralabsTBA6551Registry;

  let tbaAddress: string;
  let tba: BoralabsTBA6551Account;
  let tbaAddress2: string;
  let tba2: BoralabsTBA6551Account;

  let User1: HardhatEthersSigner;
  let User2: HardhatEthersSigner;
  let User3: HardhatEthersSigner;

  let data: string;
  const amount = 10;
  const emptyData = "0x";

  const iface1155 = new Interface([
    "function safeTransferFrom(address from, address to, uint256 tokenId, uint256 amount, bytes data)",
    "function safeBatchTransferFrom( address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data )",
    "function tbaMint(address to, uint256 amount, bytes memory data)",
    "function burn(uint256 id, uint256 amount)",
    "function setApprovalForAll(address operator, bool approved)",
    "function isApprovedForAll(address account, address operator)",
    "function transferCoin(address to, uint256 amount)",
    "function uri(uint256 id)",
    "function tokensOf(address owner)",
    "function getBaseURI() public view returns (string memory)",
    "function supportsInterface( bytes4 interfaceId )",
    "function tokenCountOf(address owner)",
    "function totalSupply(uint256 id)",
    "function exists(uint256 id)",
    "function balanceOf(address account, uint256 id)",
    "function balanceOfBatch(address[] memory accounts,uint256[] memory ids)",
  ]);

  beforeEach(async function () {
    [User1, User2, User3] = await ethers.getSigners();

    // deploy bora721
    ({ bora721 } = await loadFixture(deployBora721));

    // deploy bora1155
    ({ bora1155 } = await loadFixture(deployBora1155));

    // deploy bora 6551 account
    ({ bora6551Account } = await loadFixture(deployBora6551Account));

    // deploy bora 6551 registry
    ({ bora6551Registry } = await loadFixture(deployBora6551Registry));

    // mint erc721
    await bora721.tbaMint(User1.address);

    // create tba account
    await bora6551Registry.createAccount(
      bora6551Account.getAddress(),
      network.config.chainId as BigNumberish,
      bora721.getAddress(),
      10000001,
      0,
      emptyData
    );

    // get tba account
    tbaAddress = await bora6551Registry.account(
      bora6551Account.getAddress(),
      network.config.chainId as BigNumberish,
      bora721.getAddress(),
      10000001,
      0
    );

    tba = await ethers.getContractAt("BoralabsTBA6551Account", tbaAddress);
  });

  describe("Safe Transfer From", async function () {
    it("Should transfer successfully to other address", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      this.mlog.before(
        "[User 2]",
        "balance:",
        await bora1155.tokenCountOf(User2.address)
      );

      // Step 1: User 1 uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)
      // for TBA account with an amount of each is 10.
      this.mlog.log(
        "[TBA Account]",
        "mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001) with an amount of each is 10"
      );
      await bora1155.connect(User1).tbaMint(tbaAddress, amount, emptyData);

      // Step 2: TBA account uses execute() to call safeTransferFrom() to transfer tokenId 10000001 to User 2 with amount is 5
      this.mlog.log(
        "[TBA Account]",
        "calls execute() to transfer 10000001 with an amount of 5 to User 2"
      );
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        User2.address,
        10000001,
        5,
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 3: Verify token balance of TBA account with tokenId 10000001 is 5,
      // tokenIds (20000001, 30000001, 40000001, 50000001) and all is 10
      await expect(
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([5, 10, 10, 10, 10]);

      // Step 4: Verify token balance of User 2 with tokenId 10000001 is 5
      await expect(await bora1155.balanceOf(User2.address, 10000001)).to.be.equal(
        5
      );

      this.mlog.after(
        "[TBA Account]",
        "10000001 balance:",
        await bora1155.balanceOf(tbaAddress, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(tbaAddress, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(tbaAddress, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(tbaAddress, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(tbaAddress, 50000001)
      );

      this.mlog.after(
        "[User 2]",
        "50000001 balance:",
        await bora1155.balanceOf(User2.address, 10000001)
      );
    });

    it("Should transfer to another TBA account successfully", async function () {
      // Step 1: User 1 uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)
      this.mlog.log(
        "[TBA Account 1]",
        "mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001) with an amount of each is 10"
      );
      await bora1155.connect(User1).tbaMint(tbaAddress, amount, emptyData);

      // Step 2: User 2 uses tbaMint() to mint token ERC721 ids (10000002, 20000002, 30000002)
      this.mlog.log(
        "[User 2]",
        "mint token ERC721 ids (10000002, 20000002, 30000002)"
      );
      await bora721.connect(User2).tbaMint(User2.address);

      // Step 3: User 2 creates TBA account 2 for tokenId 10000002
      await bora6551Registry
        .connect(User2)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          10000002,
          0,
          emptyData
        );

      // get tba account
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000002,
        0
      );

      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
      this.mlog.before(
        "[TBA Account 2]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress2)
      );

      // Step 4: TBA account 1 uses execute() to call safeTransferFrom() to transfer tokenId 50000001 to TBA account 2 with amount is 10
      this.mlog.log(
        "[TBA Account 1]",
        "calls execute() to transfer 50000001 balance with an amount of 10 to Account 2"
      );
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        tbaAddress2,
        50000001,
        amount,
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 5: Verify token balance of TBA account 1 with tokenIds 10000001, 20000001, 30000001, 40000001
      // with the amount of each tokenId is 10 and 50000001 balance with amount is 0
      await expect(
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([10, 10, 10, 10, 0]);

      // Step 6: Verify token balance of TBA account 2 with tokenId 50000001 is 10
      await expect(await bora1155.balanceOf(tbaAddress2, 50000001)).to.be.equal(
        10
      );

      this.mlog.after(
        "[TBA Account 1]",
        "10000001 balance:",
        await bora1155.balanceOf(tbaAddress, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(tbaAddress, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(tbaAddress, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(tbaAddress, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(tbaAddress, 50000001)
      );

      this.mlog.after(
        "[TBA Account 2]",
        "50000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 50000001)
      );
    });

    it("Should transfer failed when transfer tokens of other address without approval", async function () {
      this.mlog.before(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1.address)
      );

      this.mlog.before(
        "[User 2]",
        "balance:",
        await bora1155.tokenCountOf(User2.address)
      );

      // Step 1: User 1 uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)
      // for itself with an amount of each is 10
      this.mlog.log(
        "[User 1]",
        "mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001) with an amount of each is 10"
      );
      await bora1155.connect(User1).tbaMint(User1.address, amount, emptyData);

      // Step 2: TBA account uses execute() to call safeTransferFrom() to transfer tokenId 10000001 of User 1
      // to User 2 with amount is 5
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call safeTransferFrom() to transfer tokenId 10000001 of User 1 to User 2 with amount is 5"
      );
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        User1.address,
        User2.address,
        10000001,
        5,
        emptyData,
      ]);

      // Step 3: Verify transfer will be reverted with error message “ERC1155: caller is not token owner or approved”
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).to.be.revertedWith("ERC1155: caller is not token owner or approved");

      // Step 4: Verify token balance of User 1 with tokenIds (10000001, 20000001, 30000001, 40000001 and 50000001)
      // with an amount of each is 10
      await expect(
        await bora1155.balanceOfBatch(
          [
            User1.address,
            User1.address,
            User1.address,
            User1.address,
            User1.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([10, 10, 10, 10, 10]);

      // Step 5: Verify token balance of TBA account with tokenId (10000001) with an amount of each is 0
      await expect(await bora1155.balanceOf(User2.address, 10000001)).to.be.equal(
        0
      );

      this.mlog.after(
        "[User 1]",
        "10000001 balance:",
        await bora1155.balanceOf(User1.address, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(User1.address, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(User1.address, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(User1.address, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(User1.address, 50000001)
      );

      this.mlog.after(
        "[User 2]",
        "10000001 balance:",
        await bora1155.balanceOf(User2.address, 10000001)
      );
    });

    it("Should transfer successful when transfer tokens of other address with approval", async function () {
      this.mlog.before(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1.address)
      );

      this.mlog.before(
        "[User 2]",
        "balance:",
        await bora1155.tokenCountOf(User2.address)
      );

      // Step 1: User 1 uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)
      // for itself with an amount of each is 10
      this.mlog.log(
        "[User 1]",
        "mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001) with an amount of each is 10"
      );
      await bora1155.connect(User1).tbaMint(User1.address, amount, emptyData);

      // Step 2: User 1 uses setApprovalForAll() to approve for TBA account
      this.mlog.log(
        "[User 1]",
        "uses setApprovalForAll() to approve for TBA account"
      );
      await bora1155.connect(User1).setApprovalForAll(tbaAddress, true);

      // Step 3: TBA account uses execute() to call safeTransferFrom() to transfer tokenId 10000001 of User 1
      // to User 2 with amount is 5
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call safeTransferFrom() to transfer tokenId 10000001 of User 1 to User 2 with amount is 5"
      );
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        User1.address,
        User2.address,
        10000001,
        5,
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 4: Verify token balance of User 1 are (20000001, 30000001, 40000001 and 50000001)
      // with an amount of each is 10 and tokenId 10000001 with amount is 5
      await expect(
        await bora1155.balanceOfBatch(
          [
            User1.address,
            User1.address,
            User1.address,
            User1.address,
            User1.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([5, 10, 10, 10, 10]);

      // Step 5: Verify token balance of User 2 is 10000001 with amount is 5
      await expect(await bora1155.balanceOf(User2.address, 10000001)).to.be.equal(
        5
      );

      this.mlog.after(
        "[User 1]",
        "10000001 balance:",
        await bora1155.balanceOf(User1, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(User1.address, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(User1.address, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(User1.address, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(User1.address, 50000001)
      );

      this.mlog.after(
        "[User 2]",
        "10000001 balance:",
        await bora1155.balanceOf(User2.address, 10000001)
      );
    });
  });

  describe("Safe Batch Transfer From", async function () {
    it("Should transfer batch successfully to other address", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      this.mlog.before(
        "[User 2]",
        "balance:",
        await bora1155.tokenCountOf(User2.address)
      );

      // Step 1: User 1 uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)
      // for TBA account with an amount of each is 10
      this.mlog.log(
        "[TBA Account]",
        "mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001) with an amount of each is 10"
      );
      await bora1155.connect(User1).tbaMint(tbaAddress, amount, emptyData);

      // Step 2: TBA account uses execute() to call safeBatchTransferFrom()
      // to transfer tokens id 10000001, 20000001, 30000001, 40000001 and 50000001 to User 2 with an amount of each is 5
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call safeBatchTransferFrom() to transfer 5 tokens to User 2 with an amount of each is 5"
      );
      data = iface1155.encodeFunctionData("safeBatchTransferFrom", [
        tbaAddress,
        User2.address,
        [10000001, 20000001, 30000001, 40000001, 50000001],
        [5, 5, 5, 5, 5],
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 3: Verify token balance of TBA account with tokens id 10000001, 20000001, 30000001, 40000001 and 50000001 are 5
      await expect(
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([5, 5, 5, 5, 5]);

      // Step 4: Verify token balance of User 2 with tokens id 10000001, 20000001, 30000001, 40000001 and 50000001 are 5
      await expect(
        await bora1155.balanceOfBatch(
          [
            User2.address,
            User2.address,
            User2.address,
            User2.address,
            User2.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([5, 5, 5, 5, 5]);

      this.mlog.after(
        "[TBA Account]",
        "10000001 balance:",
        await bora1155.balanceOf(tbaAddress, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(tbaAddress, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(tbaAddress, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(tbaAddress, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(tbaAddress, 50000001)
      );

      this.mlog.after(
        "[User 2]",
        "10000001 balance:",
        await bora1155.balanceOf(User2.address, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(User2.address, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(User2.address, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(User2.address, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(User2.address, 50000001)
      );
    });

    it("Should transfer batch to another TBA account successfully", async function () {
      // Step 1: User 1 uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)
      // for TBA account 1 with an amount of each is 10
      this.mlog.log(
        "[TBA Account 1]",
        "mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001) with an amount of each is 10"
      );
      await bora1155.connect(User1).tbaMint(tbaAddress, amount, emptyData);

      // Step 2: User 2 uses tbaMint() to mint token ERC721 ids (10000002, 20000002, 30000002)
      this.mlog.log(
        "[User 2]",
        "mint token ERC721 ids (10000002, 20000002, 30000002)"
      );
      await bora721.connect(User2).tbaMint(User2.address);

      // Step 3: User 2 creates TBA account 2 for tokenId 10000002
      await bora6551Registry
        .connect(User2)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          10000002,
          0,
          emptyData
        );

      // get tba account
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000002,
        0
      );

      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
      this.mlog.before(
        "[TBA Account 2]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress2)
      );

      // Step 4: TBA account uses execute() to call safeBatchTransferFrom()
      // to transfer tokens id 40000001, 50000001 to TBA account 2 with an amount of each is 10
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to call safeBatchTransferFrom() to transfer tokens id 40000001, 50000001 to TBA account 2 with an amount of each is 10"
      );
      data = iface1155.encodeFunctionData("safeBatchTransferFrom", [
        tbaAddress,
        User2.address,
        [40000001, 50000001],
        [amount, amount],
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 5: Verify token balance of TBA account 1 with tokenIds 10000001, 20000001, 30000001
      // with the amount of each tokenId is 10 and tokenIds 40000001, 50000001 with amount is 0
      await expect(
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([10, 10, 10, 0, 0]);

      // Step 6: Verify token balance of TBA account 2 with tokenIds 40000001, 50000001 with an amount of each tokenId is 10
      await expect(
        await bora1155.balanceOfBatch(
          [
            User2.address,
            User2.address,
            User2.address,
            User2.address,
            User2.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([0, 0, 0, 10, 10]);

      this.mlog.after(
        "[TBA Account]",
        "10000001 balance:",
        await bora1155.balanceOf(tbaAddress, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(tbaAddress, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(tbaAddress, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(tbaAddress, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(tbaAddress, 50000001)
      );

      this.mlog.after(
        "[User 2]",
        "40000001 balance:",
        await bora1155.balanceOf(User2.address, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(User2.address, 50000001)
      );
    });

    it("Should transfer batch to another TBA account failed when ids and amounts length mismatch", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      this.mlog.before(
        "[User 2]",
        "balance:",
        await bora1155.tokenCountOf(User2.address)
      );

      // Step 1: User 1 uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)
      // for TBA account with amount of each is 10
      this.mlog.log(
        "[TBA Account]",
        "mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001) with amount of each is 10"
      );
      await bora1155.connect(User1).tbaMint(tbaAddress, amount, emptyData);

      // Step 2: TBA account 1 uses execute() to call safeBatchTransferFrom() to transfer tokenIds [10000001, 20000001]
      //  to User 2 with amount [10] so result is reverted with error message “ERC1155: ids and amounts length mismatch”
      this.mlog.log(
        "[User 2]",
        "uses execute() to call safeBatchTransferFrom() transfer tokenIds [10000001, 20000001] from User 1 to User 2"
      );

      data = iface1155.encodeFunctionData("safeBatchTransferFrom", [
        tbaAddress,
        User2.address,
        [10000001, 20000001],
        [amount],
        emptyData,
      ]);
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).to.be.revertedWith("ERC1155: ids and amounts length mismatch");

      // Verify token balance of TBA account with tokenIds 10000001, 20000001, 30000001, 40000001 and 50000001
      // with an amount of each is 10
      await expect(
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([10, 10, 10, 10, 10]);

      // Verify token balance of User 2 with tokenIds 10000001, 20000001, 30000001, 40000001 and 50000001
      // with an amount of each is 0
      await expect(
        await bora1155.balanceOfBatch(
          [
            User2.address,
            User2.address,
            User2.address,
            User2.address,
            User2.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([0, 0, 0, 0, 0]);

      this.mlog.after(
        "[TBA Account]",
        "10000001 balance:",
        await bora1155.balanceOf(tbaAddress, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(tbaAddress, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(tbaAddress, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(tbaAddress, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(tbaAddress, 50000001)
      );

      this.mlog.after(
        "[User 2]",
        "10000001 balance:",
        await bora1155.balanceOf(User2.address, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(User2.address, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(User2.address, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(User2.address, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(User2.address, 50000001)
      );
    });

    it("Should transfer batch failed when transfer the tokens of other address without approval", async function () {
      this.mlog.before(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1.address)
      );

      this.mlog.before(
        "[User 2]",
        "balance:",
        await bora1155.tokenCountOf(User2.address)
      );

      // Step 1: User 1 uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)
      // for itself with an amount of each is 10
      this.mlog.log("[User 1]", "mint tokens ERC1155 with an amount of 10");
      await bora1155.connect(User1).tbaMint(User1.address, amount, emptyData);

      // Step 2: TBA account uses execute() to call safeBatchTransferFrom() to transfer tokens id 10000001, 20000001, 30000001 of User 1
      // to User 2 with amount is 5
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call safeBatchTransferFrom() to transfer tokens id 10000001, 20000001, 30000001 of User 1 with amount is 5"
      );
      data = iface1155.encodeFunctionData("safeBatchTransferFrom", [
        User1.address,
        User2.address,
        [10000001, 20000001, 30000001],
        [5, 5, 5],
        emptyData,
      ]);

      // Step 3: Verify transfer will be reverted with error message “ERC1155: caller is not token owner or approved”
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).to.be.revertedWith("ERC1155: caller is not token owner or approved");

      // Step 4: Verify token balance of User 1 with tokenIds (10000001, 20000001, 30000001, 40000001 and 50000001)
      // with an amount of each is 10
      await expect(
        await bora1155.balanceOfBatch(
          [
            User1.address,
            User1.address,
            User1.address,
            User1.address,
            User1.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([10, 10, 10, 10, 10]);

      // Step 5: Verify token balance of User 2 are (10000001, 20000001, 30000001, 40000001 and 50000001) with an amount of each is 0
      await expect(
        await bora1155.balanceOfBatch(
          [
            User2.address,
            User2.address,
            User2.address,
            User2.address,
            User2.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([0, 0, 0, 0, 0]);

      this.mlog.after(
        "[User 1]",
        "10000001 balance:",
        await bora1155.balanceOf(User1.address, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(User1.address, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(User1.address, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(User1.address, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(User1.address, 50000001)
      );

      this.mlog.after(
        "[User 2]",
        "10000001 balance:",
        await bora1155.balanceOf(User2.address, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(User2.address, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(User2.address, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(User2.address, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(User2.address, 50000001)
      );
    });

    it("Should transfer successful when transfer tokens of other address with approval", async function () {
      this.mlog.before(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1.address)
      );

      this.mlog.before(
        "[User 2]",
        "balance:",
        await bora1155.tokenCountOf(User2.address)
      );

      // Step 1: User 1 uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)
      // for itself with an amount of each is 10
      this.mlog.log("[User 1]", "mint tokens ERC1155 with an amount of 10");
      await bora1155.connect(User1).tbaMint(User1.address, amount, emptyData);

      // Step 2: User 1 uses setApprovalForAll() to approve for TBA account
      this.mlog.log(
        "[User 1]",
        "uses setApprovalForAll() to approve for TBA account"
      );
      await bora1155.connect(User1).setApprovalForAll(tbaAddress, true);

      // Step 3: TBA account uses execute() to call safeBatchTransferFrom() to transfer tokens id 10000001, 20000001,
      // 30000001, 40000001 and 50000001 of User 1 to User 2 with amount is 5
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call safeBatchTransferFrom() to transfer 5 tokens of User 1 to User 2 with amount is 5"
      );
      data = iface1155.encodeFunctionData("safeBatchTransferFrom", [
        User1.address,
        User2.address,
        [10000001, 20000001, 30000001, 40000001, 50000001],
        [5, 5, 5, 5, 5],
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 4: Verify token balance of User 1 are (10000001, 20000001, 30000001, 40000001 and 50000001)
      // with an amount of each is 5
      await expect(
        await bora1155.balanceOfBatch(
          [
            User1.address,
            User1.address,
            User1.address,
            User1.address,
            User1.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([5, 5, 5, 5, 5]);

      // Step 5: Verify token balance of User 2 are (10000001, 20000001, 30000001, 40000001 and 50000001)
      // with an amount of each is 5
      await expect(
        await bora1155.balanceOfBatch(
          [
            User2.address,
            User2.address,
            User2.address,
            User2.address,
            User2.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([5, 5, 5, 5, 5]);

      this.mlog.after(
        "[User 1]",
        "10000001 balance:",
        await bora1155.balanceOf(User1.address, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(User1.address, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(User1.address, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(User1.address, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(User1.address, 50000001)
      );

      this.mlog.after(
        "[User 2]",
        "10000001 balance:",
        await bora1155.balanceOf(User2.address, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(User2.address, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(User2.address, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(User2.address, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(User2.address, 50000001)
      );
    });
  });

  describe("TBA Mint", async function () {
    it("Should mint successful when minting for itself", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint token ERC1155 ids
      // (10000001, 20000001, 30000001, 40000001 and 50000001) for itself with amount is 10.
      this.mlog.log(
        "[TBA Account]",
        "call execute() to mint tokens ERC1155 with an amount of each is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress,
        amount,
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 2: Verify token balance of TBA account are
      // 10000001, 20000001, 30000001, 40000001, 50000001 with the amount of each tokenId is 10.
      expect(await bora1155.tokensOf(tbaAddress)).to.deep.equal([
        [10000001, 20000001, 30000001, 40000001, 50000001],
        [10, 10, 10, 10, 10],
      ]);

      this.mlog.after(
        "[TBA Account]",
        "10000001 balance:",
        await bora1155.balanceOf(tbaAddress, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(tbaAddress, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(tbaAddress, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(tbaAddress, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(tbaAddress, 50000001)
      );
    });

    it("Should TBA account mint successful when minting for other wallet", async function () {
      this.mlog.before(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1.address)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint token ERC1155 ids
      // (10000001, 20000001, 30000001, 40000001 and 50000001) for User 1 with amount is 10.
      this.mlog.log(
        "[TBA Account]",
        "call execute() to mint tokens ERC1155 for User 1 with an amount of each is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        User1.address,
        amount,
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 2: Verify token balance of User 1 are 10000001, 20000001, 30000001, 40000001, 50000001
      // with the amount of each tokenId is 10.
      expect(await bora1155.tokensOf(User1.address)).to.deep.equal([
        [10000001, 20000001, 30000001, 40000001, 50000001],
        [10, 10, 10, 10, 10],
      ]);

      this.mlog.after(
        "[User 1]",
        "10000001 balance:",
        await bora1155.balanceOf(User1.address, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(User1.address, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(User1.address, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(User1.address, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(User1.address, 50000001)
      );
    });

    it("Should mint successful when minting for other TBA account", async function () {
      // Step 1: User 1 creates a TBA account 2 with tokenId 20000001.
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          20000001,
          0,
          emptyData
        );

      // Get TBA account 2 address
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        20000001,
        0
      );

      this.mlog.before(
        "[TBA Account 2]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress2)
      );

      // Step 2: TBA account 1 uses execute() to call tbaMint() to mint token ERC1155 ids
      // (10000001, 20000001, 30000001, 40000001 and 50000001) for TBA account 2 with amount is 10.
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to mint tokens ERC1155 for TBA account 2 with an amount of each is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress2,
        amount,
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 3: Verify token balance of TBA account 2 are 10000001, 20000001, 30000001, 40000001, 50000001
      // with the amount of each tokenId is 10.
      expect(await bora1155.tokensOf(tbaAddress2)).to.deep.equal([
        [10000001, 20000001, 30000001, 40000001, 50000001],
        [10, 10, 10, 10, 10],
      ]);

      this.mlog.after(
        "[TBA Account 2]",
        "10000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 50000001)
      );
    });
  });

  describe("Burn", async function () {
    it("Should be successful when burning token of itself", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint token ERC1155 ids
      // (10000001, 20000001, 30000001, 40000001 and 50000001) for itself with amount is 10.
      this.mlog.log(
        "[TBA Account]",
        "call execute() to mint tokens ERC1155 with an amount of each is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress,
        amount,
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 2: TBA account using execute() to burn ERC1155 token id is 10000001 with amount is 10.
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to burn ERC1155 token id is 10000001 with amount is 10."
      );
      data = iface1155.encodeFunctionData("burn", [10000001, amount]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 3: Verify token balance of tokens id 20000001, 30000001, 40000001, 50000001 is 10.
      // Step 4: Verify token balance of token id 10000001 is 0.
      expect(await bora1155.tokensOf(tbaAddress)).to.deep.equal([
        [10000001, 20000001, 30000001, 40000001, 50000001],
        [0, 10, 10, 10, 10],
      ]);

      this.mlog.after(
        "[TBA Account]",
        "10000001 balance:",
        await bora1155.balanceOf(tbaAddress, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(tbaAddress, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(tbaAddress, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(tbaAddress, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(tbaAddress, 50000001)
      );
    });

    it("Should be successful when burning token of other wallet", async function () {
      this.mlog.before(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1.address)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint token ERC1155 ids
      // (10000001, 20000001, 30000001, 40000001 and 50000001) for User 1 with amount is 10.
      this.mlog.log(
        "[TBA Account]",
        "call execute() to mint tokens ERC1155 with an amount of each is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        User1.address,
        amount,
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 2: User 1 calls setApprovalForAll() to approve all for TBA account.
      this.mlog.log(
        "[User 1]",
        "calls setApprovalForAll() to to approve all for TBA account."
      );
      await bora1155.connect(User1).setApprovalForAll(tbaAddress, true);

      // Step 3: TBA account using execute() to burn ERC1155 token id is 10000001 with amount is 10.
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to burn ERC1155 token id is 10000001 with amount is 10."
      );
      data = iface1155.encodeFunctionData("burn", [10000001, amount]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 3: Verify token balance of tokens id 20000001, 30000001, 40000001, 50000001 is 10.
      // Step 4: Verify token balance of token id 10000001 is 0.
      expect(await bora1155.tokensOf(User1.address)).to.deep.equal([
        [10000001, 20000001, 30000001, 40000001, 50000001],
        [0, 10, 10, 10, 10],
      ]);

      this.mlog.after(
        "[User 1]",
        "10000001 balance:",
        await bora1155.balanceOf(User1.address, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(User1.address, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(User1.address, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(User1.address, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(User1.address, 50000001)
      );
    });

    it("Should be successful when burning token of other TBA account", async function () {
      // Step 1: User 1 creates a TBA account 2 with tokenId 20000001.
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          20000001,
          0,
          emptyData
        );

      // Get TBA account 2 address
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        20000001,
        0
      );

      tba2 = await ethers.getContractAt("BoralabsTBA6551Account", tbaAddress2);

      this.mlog.before(
        "[TBA Account 2]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress2)
      );

      // Step 2: TBA account 1 uses execute() to call tbaMint() to mint token ERC1155 ids
      // (10000001, 20000001, 30000001, 40000001 and 50000001) for TBA account 2 with amount is 10.
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to mint tokens ERC1155 for TBA account 2 with an amount of each is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress2,
        amount,
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 3: TBA account 2 uses execute() to call setApprovalForAll() to approve all for TBA account 1.
      this.mlog.log(
        "[TBA Account 2]",
        "uses execute() to call setApprovalForAll() to approve all for TBA account 1."
      );
      data = iface1155.encodeFunctionData("setApprovalForAll", [
        tbaAddress,
        true,
      ]);
      await tba2.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 4: TBA account 1 using execute() to burn the token of TBA account 2 with id is 10000001
      // and amount is 10.
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to burn the token of TBA account 2 with id is 10000001 and amount is 10."
      );
      data = iface1155.encodeFunctionData("burn", [10000001, amount]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 5: Verify token balance of TBA account 2 are 20000001, 30000001, 40000001, 50000001
      // with the amount of each tokenId is 10.
      // Step 6: Verify token balance of token id 10000001 is 0.
      expect(await bora1155.tokensOf(tbaAddress2)).to.deep.equal([
        [10000001, 20000001, 30000001, 40000001, 50000001],
        [0, 10, 10, 10, 10],
      ]);

      this.mlog.after(
        "[TBA Account 2]",
        "10000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 50000001)
      );
    });

    it("Should failed when burning token of other TBA account without approval", async function () {
      // Step 1: User 1 creates a TBA account 2 with tokenId 20000001.
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          20000001,
          0,
          emptyData
        );

      // Get TBA account 2 address
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        20000001,
        0
      );

      tba2 = await ethers.getContractAt("BoralabsTBA6551Account", tbaAddress2);

      this.mlog.before(
        "[TBA Account 2]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress2)
      );

      // Step 2: TBA account 1 uses execute() to call tbaMint() to mint token ERC1155 ids
      // (10000001, 20000001, 30000001, 40000001 and 50000001) for TBA account 2 with amount is 10.
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to mint tokens ERC1155 for TBA account 2 with an amount of each is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress2,
        amount,
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 3: TBA account 1 using execute() to burn the token of TBA account 2
      // with id is 10000001 and amount is 10.
      // Step 4: Verify transaction will be reverted with error message “Caller is not token owner or approved”.
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to burn the token of TBA account 2 with id is 10000001 and amount is 10."
      );
      data = iface1155.encodeFunctionData("burn", [10000001, amount]);
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).revertedWith("Caller is not token owner or approved");

      // Step 5: Verify token balance of TBA account 2 is not changed.
      expect(await bora1155.tokensOf(tbaAddress2)).to.deep.equal([
        [10000001, 20000001, 30000001, 40000001, 50000001],
        [10, 10, 10, 10, 10],
      ]);

      this.mlog.after(
        "[TBA Account 2]",
        "10000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(tbaAddress2, 50000001)
      );
    });

    it("Should failed when burning token of other wallet without approval", async function () {
      this.mlog.before(
        "[User 2]",
        "balance:",
        await bora1155.tokenCountOf(User2.address)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint token ERC1155 ids
      // (10000001, 20000001, 30000001, 40000001 and 50000001) for User 2 with amount is 10.
      this.mlog.log(
        "[TBA Account]",
        "call execute() to mint tokens ERC1155 for User 2 with an amount of each is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        User2.address,
        amount,
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 2: TBA account using execute() to burn the token of User 2
      // with id is 10000001 and amount is 10.
      // Step 3: Verify transaction will be reverted with error message “Caller is not token owner or approved”.
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to burn the token of User 2 with id is 10000001 and amount is 10."
      );
      data = iface1155.encodeFunctionData("burn", [10000001, amount]);
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).revertedWith("Caller is not token owner or approved");

      // Step 4: Verify token balance of User 2 is not changed.
      expect(await bora1155.tokensOf(User2.address)).to.deep.equal([
        [10000001, 20000001, 30000001, 40000001, 50000001],
        [10, 10, 10, 10, 10],
      ]);

      this.mlog.after(
        "[User 2]",
        "10000001 balance:",
        await bora1155.balanceOf(User2.address, 10000001),
        "20000001 balance:",
        await bora1155.balanceOf(User2.address, 20000001),
        "30000001 balance:",
        await bora1155.balanceOf(User2.address, 30000001),
        "40000001 balance:",
        await bora1155.balanceOf(User2.address, 40000001),
        "50000001 balance:",
        await bora1155.balanceOf(User2.address, 50000001)
      );
    });
  });

  describe("URI", async function () {
    it("Should get uri failed when using an token id 0", async function () {
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to call uri() to get uri with token id 0"
      );

      // Step 1: TBA account uses execute() to call uri() to get uri with token id 0
      // Step 2: Verify transaction will be reverted with error message “invalid tokenId”
      data = iface1155.encodeFunctionData("uri", [0]);
      await expect(tba.execute(bora1155.target, 0, data, 0)).to.be.revertedWith(
        "invalid tokenId"
      );
    });

    it("Should get uri successfully", async function () {
      // Step 1: TBA account uses execute() to call uri() to get uri with token id 10000001
      // Step 2: Verify transaction successfully
      // Step 3: Verify the result is https://tokenmetadata.boraportal.com/contracts/2022999998/tokens/1
      const tokenId = 10000001;
      data = iface1155.encodeFunctionData("uri", [tokenId]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let uri = Util.decodeFunctionResult(["bytes"], result.toString())[0];
      await expect(uri).to.be.equal(
        "https://tokenmetadata.boraportal.com/contracts/2022999998/tokens/1"
      );

      this.mlog.log("[Bora1155]", "token id 10000001 uri:", uri);
    });
  });

  describe("Get Base URI", async function () {
    it("Should get base uri successfully", async function () {
      // Step 1: TBA account uses execute() to call getBaseUri() to get base uri
      // Step 2: Verify transaction successfully
      data = iface1155.encodeFunctionData("getBaseURI", []);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let baseURI = Util.decodeFunctionResult(["bytes"], result.toString())[0];

      // Step 3: Verify the result is https://tokenmetadata.boraportal.com/contracts/2022999998/tokens/
      await expect(baseURI).to.be.equal(
        "https://tokenmetadata.boraportal.com/contracts/2022999998/tokens/"
      );

      this.mlog.log("[Bora1155]", "base uri:", await bora1155.getBaseURI());
    });
  });

  describe("Tokens Of", async function () {
    it("Should get tokens of TBA account successfully", async function () {
      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001, 50000001)
      // with amount is 1 for each of TBA accounts.
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to call tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001, 50000001) with amount = 1"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress,
        1,
        emptyData,
      ]);
      await tba.execute(bora1155.target, 0, data, 0);

      // Step 2: Verify TBA account uses execute() to call tokensOf() to get token count of TBA account and result is
      // tokens [10000001, 20000001, 30000001, 40000001, 50000001] and balances [1, 1, 1, 1, 1]
      data = iface1155.encodeFunctionData("tokensOf", [tbaAddress]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let tokens = Util.decodeFunctionResult(
        ["uint256[]", "uint256[]"],
        result.toString()
      );

      await expect(tokens).to.be.deep.equal([
        ["10000001", "20000001", "30000001", "40000001", "50000001"],
        ["1", "1", "1", "1", "1"],
      ]);

      this.mlog.after("[TBA Account 1]", "balance: ", tokens);
    });
  });

  describe("Tokens Count Of", async function () {
    it("Should get token count of TBA account successfully", async function () {
      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001, 50000001)
      // with amount is 1 for TBA account
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to call tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001, 50000001) with amount = 1"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress,
        1,
        emptyData,
      ]);
      await tba.execute(bora1155.target, 0, data, 0);

      // Step 2: Verify TBA account uses execute() to call tokenCountOf() to get token count of TBA account so result is 5
      data = iface1155.encodeFunctionData("tokenCountOf", [tbaAddress]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let tokenCount = Util.decodeFunctionResult(
        ["uint256"],
        result.toString()
      );
      await expect(tokenCount[0]).to.be.equal(5);

      this.mlog.after("[TBA Account 1]", "balance:", tokenCount[0]);
    });
  });

  describe("Total Supply", async function () {
    it("Should get total supply successfully", async function () {
      this.mlog.before(
        "[10000001]",
        "total supply:",
        await bora1155.totalSupply(10000001)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001, 50000001)
      // with amount is 1 for TBA account
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to call tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001) for itself with amount is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress,
        amount,
        emptyData,
      ]);
      await tba.execute(bora1155.target, 0, data, 0);

      // Step 2: Verify TBA account uses execute() to call totalSupply() to get total supply with id 10000001 so result is 10
      data = iface1155.encodeFunctionData("totalSupply", [10000001]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let totalSupply = Util.decodeFunctionResult(
        ["uint256"],
        result.toString()
      );
      await expect(totalSupply[0]).to.be.equal(10);

      this.mlog.after("[10000001]", "total supply:", totalSupply[0]);
    });
  });

  describe("Exists", async function () {
    it("Should get exists correctly when token is valid", async function () {
      this.mlog.before(
        "[10000001]",
        "is exist:",
        await bora1155.exists(10000001)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint token ERC1155
      // ids (10000001, 20000001, 30000001, 40000001, 50000001) with amount is 1 for TBA account
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to call tbaMint() to mint token ERC1155",
        "ids (10000001, 20000001, 30000001, 40000001 and 50000001) for itself with amount is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress,
        amount,
        emptyData,
      ]);
      await tba.execute(bora1155.target, 0, data, 0);

      // Step 2: Verify TBA account uses execute() to call exists() to check token id 10000001 so result is true.
      data = iface1155.encodeFunctionData("exists", [10000001]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let decodeResult = Util.decodeFunctionResult(
        ["uint256"],
        result.toString()
      );
      let isExists = Util.toBoolean(decodeResult[0]);
      await expect(isExists).to.be.equal(true);

      this.mlog.after("[10000001]", "is exist:", isExists);
    });

    it("Should get exists correctly when token is invalid", async function () {
      const invalidTokenId = 60000001;
      this.mlog.before(
        "[60000001]",
        "is exist:",
        await bora1155.exists(invalidTokenId)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001, 50000001)
      // with amount is 1 for TBA account
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to call tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001) for itself with amount is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress,
        amount,
        emptyData,
      ]);
      await tba.execute(bora1155.target, 0, data, 0);

      // Step 2: Verify TBA account uses execute() to call exists() to check token id 60000001 so result is false.
      data = iface1155.encodeFunctionData("exists", [invalidTokenId]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let decodeResult = Util.decodeFunctionResult(
        ["uint256"],
        result.toString()
      );
      let isExists = Util.toBoolean(decodeResult[0]);
      await expect(isExists).to.be.equal(false);

      this.mlog.after("[60000001]", "is exist:", isExists);
    });
  });

  describe("Supports Interface", async function () {
    it("Should support interface ERC1155", async function () {
      // Step 1: Verify TBA account uses execute() to call supportsInterface() with interface id (0xd9b67a26) so result is true.
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call supportsInterface() with interface id (0xd9b67a26) so result is true"
      );
      data = iface1155.encodeFunctionData("supportsInterface", ["0xd9b67a26"]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let decodeResult = Util.decodeFunctionResult(
        ["uint256"],
        result.toString()
      );
      let isSupportInterface = Util.toBoolean(decodeResult[0]);
      await expect(isSupportInterface).to.be.equal(true);
    });

    it("Should support interface ERC165", async function () {
      // Step 1: Verify TBA account uses execute() to call supportsInterface() with interface id (0x01ffc9a7) so result is true.
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call supportsInterface() with interface id (0x01ffc9a7) so result is true"
      );
      data = iface1155.encodeFunctionData("supportsInterface", ["0x01ffc9a7"]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let decodeResult = Util.decodeFunctionResult(
        ["uint256"],
        result.toString()
      );
      let isSupportInterface = Util.toBoolean(decodeResult[0]);
      await expect(isSupportInterface).to.be.equal(true);
    });

    it("Should support interface ERC1155MetadataURI", async function () {
      // Step 1: Verify TBA account uses execute() to call supportsInterface() with interface id (0x0e89341c) so result is true.
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call supportsInterface() with interface id (0x0e89341c) so result is true"
      );
      data = iface1155.encodeFunctionData("supportsInterface", ["0x0e89341c"]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let decodeResult = Util.decodeFunctionResult(
        ["uint256"],
        result.toString()
      );
      let isSupportInterface = Util.toBoolean(decodeResult[0]);
      await expect(isSupportInterface).to.be.equal(true);
    });

    it("Should not support interface when interface id is invalid", async function () {
      // Step 1: Verify TBA account uses execute() to call supportsInterface() with interface id (0x00000000) so result is false.
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call supportsInterface() with interface id (0x00000000) so result is false"
      );
      data = iface1155.encodeFunctionData("supportsInterface", ["0x00000000"]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let decodeResult = Util.decodeFunctionResult(
        ["uint256"],
        result.toString()
      );
      let isSupportInterface = Util.toBoolean(decodeResult[0]);
      await expect(isSupportInterface).to.be.equal(false);
    });
  });

  describe("Balance Of", async function () {
    it("Should get balance of TBA account successfully", async function () {
      this.mlog.before(
        "[TBA Account]",
        "token id 10000001:",
        await bora1155.balanceOf(tbaAddress, 10000001),
        "token id 20000001:",
        await bora1155.balanceOf(tbaAddress, 20000001),
        "token id 30000001:",
        await bora1155.balanceOf(tbaAddress, 30000001),
        "token id 40000001:",
        await bora1155.balanceOf(tbaAddress, 40000001),
        "token id 50000001:",
        await bora1155.balanceOf(tbaAddress, 50000001)
      );

      // User 1 uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)
      // for TBA account with an amount of each is 10
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to call tbaMint() to mint token ERC1155",
        "ids (10000001, 20000001, 30000001, 40000001 and 50000001) for itself with amount is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress,
        amount,
        emptyData,
      ]);
      await tba.execute(bora1155.target, 0, data, 0);

      // Step 2: Verify TBA account uses execute() to call balanceOf()
      // with account is TBA account and token id 10000001 so result is 10
      data = iface1155.encodeFunctionData("balanceOf", [tbaAddress, 10000001]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let balance = Util.decodeFunctionResult(
        ["uint256"],
        result.toString()
      )[0];
      await expect(balance).to.be.equal(10);

      this.mlog.after(
        "[TBA Account]",
        "token id 10000001:",
        await bora1155.balanceOf(tbaAddress, 10000001),
        "token id 20000001:",
        await bora1155.balanceOf(tbaAddress, 20000001),
        "token id 30000001:",
        await bora1155.balanceOf(tbaAddress, 30000001),
        "token id 40000001:",
        await bora1155.balanceOf(tbaAddress, 40000001),
        "token id 50000001:",
        await bora1155.balanceOf(tbaAddress, 50000001)
      );
    });

    it("Should get balance of other address successfully", async function () {
      // User 1 uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)
      // for User 1 with an amount of each is 10
      this.mlog.log(
        "User 1]",
        "uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)",
        "for User 1 with an amount of each is 10"
      );
      await bora1155.connect(User1).tbaMint(User1.address, amount, emptyData);

      // Step 2: Verify TBA account uses execute() to call balanceOf() with account is User 1 and token id is 10000001 so result is 10
      data = iface1155.encodeFunctionData("balanceOf", [
        User1.address,
        10000001,
      ]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let balance = Util.decodeFunctionResult(
        ["uint256"],
        result.toString()
      )[0];
      await expect(balance).to.be.equal(10);
    });
  });

  describe("Balance Of Batch", async function () {
    it("Should get balance of a batch TBA accounts successfully", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );

      // User 1 uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)
      // for TBA account with an amount of each is 10
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to call tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001) for itself with amount is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress,
        amount,
        emptyData,
      ]);
      await tba.execute(bora1155.target, 0, data, 0);

      // Step 2: Verify TBA account uses execute() to call balanceOfBatch() with accounts
      // [TBA account, TBA account, TBA account] tokenIds [10000001, 20000001, 30000001] so result is [10, 10, 10]
      data = iface1155.encodeFunctionData("balanceOfBatch", [
        [tbaAddress, tbaAddress, tbaAddress],
        [10000001, 20000001, 30000001],
      ]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let balance = Util.decodeFunctionResult(
        ["uint256[]"],
        result.toString()
      )[0];
      await expect(balance).to.deep.equal([10, 10, 10]);

      this.mlog.after("[TBA Account]", "balance:", balance);
    });

    it("Should get balance of a batch of other addresses successfully", async function () {
      this.mlog.before(
        "[User 1]",
        "balance:",
        await bora1155.balanceOfBatch(
          [
            User1.address,
            User1.address,
            User1.address,
            User1.address,
            User1.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );
      this.mlog.before(
        "[User 2]",
        "balance:",
        await bora1155.balanceOfBatch(
          [
            User2.address,
            User2.address,
            User2.address,
            User2.address,
            User2.address,
          ],
          [10000002, 20000002, 30000002, 40000002, 50000002]
        )
      );

      // User 1 uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)
      // for User 1 account with an amount of each is 10
      this.mlog.log(
        "[User 1]",
        "uses tbaMint() to mint token ERC1155 ids (10000001, 20000001, 30000001, 40000001 and 50000001)",
        "for User 1 with an amount of each is 10"
      );
      await bora1155.connect(User1).tbaMint(User1.address, amount, emptyData);

      // Step 2: User 2 uses tbaMint() to mint token ERC1155 ids (10000002, 20000002, 30000002, 40000002 and 50000002)
      // for itself with an amount of each is 10
      this.mlog.log(
        "[User 2]",
        "uses tbaMint() to mint token ERC1155 ids (10000002, 20000002, 30000002, 40000002 and 50000002)",
        "for User 2 with an amount of each is 10"
      );
      await bora1155.connect(User2).tbaMint(User2.address, amount, emptyData);

      // Step 3: Verify TBA account uses execute() to call balanceOfBatch()
      // with accounts [User 1, User2] and tokenIds [10000001, 10000002] so result is [10, 10]
      data = iface1155.encodeFunctionData("balanceOfBatch", [
        [User1.address, User2.address],
        [10000001, 10000002],
      ]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let balance = Util.decodeFunctionResult(
        ["uint256[]"],
        result.toString()
      )[0];
      await expect(balance).to.deep.equal([10, 10]);

      this.mlog.after(
        "[User 1]",
        "balance:",
        await bora1155.balanceOfBatch(
          [
            User1.address,
            User1.address,
            User1.address,
            User1.address,
            User1.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );
      this.mlog.after(
        "[User 2]",
        "balance:",
        await bora1155.balanceOfBatch(
          [
            User2.address,
            User2.address,
            User2.address,
            User2.address,
            User2.address,
          ],
          [10000002, 20000002, 30000002, 40000002, 50000002]
        )
      );
    });
  });

  describe("Set Approval For All", async function () {
    it("Should set approval for other address successfully", async function () {
      this.mlog.before(
        "[TBA Account 1]",
        "is approval for all to",
        "[User2]",
        await bora1155.isApprovedForAll(tbaAddress, User2.address)
      );

      // Step 1: Verify TBA account uses execute() to call setApprovalForAll() with 2 parameters
      // (operator is User 2’s address, approved is true) is successful
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to call setApprovalForAll() with 2 parameters",
        "(operator is User 2’s address, approved is true) is successful"
      );
      data = iface1155.encodeFunctionData("setApprovalForAll", [
        User2.address,
        true,
      ]);
      expect(await tba.execute(bora1155.target, 0, data, 0)).to.be.ok;

      this.mlog.after(
        "[TBA Account 1]",
        "is approval for all to",
        "[User2]",
        await bora1155.isApprovedForAll(tbaAddress, User2.address)
      );
    });

    it("Should TBA account set approval for itself failed", async function () {
      this.mlog.before(
        "[TBA Account 1]",
        "is approval for all to",
        "[TBA Account 1]",
        await bora1155.isApprovedForAll(tbaAddress, tbaAddress)
      );

      // Step 1: Verify TBA account uses execute() to call setApprovalForAll() with 2 parameters
      // (operator is TBA’s address, approved is true) is reverted with error message “ERC1155: setting approval status for self”
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to call setApprovalForAll() with 2 parameters",
        "(operator is TBA’s address, approved is true) is reverted with error message “ERC1155: setting approval status for self”"
      );
      data = iface1155.encodeFunctionData("setApprovalForAll", [
        tbaAddress,
        true,
      ]);
      await expect(tba.execute(bora1155.target, 0, data, 0)).to.be.revertedWith(
        "ERC1155: setting approval status for self"
      );

      this.mlog.after(
        "[TBA Account 1]",
        "is approval for all to",
        "[TBA Account 1]",
        await bora1155.isApprovedForAll(tbaAddress, tbaAddress)
      );
    });

    it("Should set approval for TBA account address successfully", async function () {
      this.mlog.before(
        "[User1]",
        "is approval for all to",
        "[TBA Account 1]",
        await bora1155.isApprovedForAll(User1, tbaAddress)
      );

      // Step 1: Verify User 1 uses setApprovalForAll() with 2 parameters
      // (operator is TBA’s address, approved is true) is successful
      this.mlog.log(
        "[User 1]",
        "uses setApprovalForAll() with 2 parameters (operator is TBA’s address, approved is true) is successful"
      );
      expect(await bora1155.connect(User1).setApprovalForAll(tbaAddress, true))
        .to.be.ok;

      this.mlog.after(
        "[User1]",
        "is approval for all to",
        "[TBA Account 1]",
        await bora1155.isApprovedForAll(User1, tbaAddress)
      );
    });
  });

  describe("Is Approved For All", async function () {
    it("Should get approval for all successfully", async function () {
      this.mlog.before(
        "[TBA Account 1]",
        " is approval for all to",
        "[User2]",
        await bora1155.isApprovedForAll(tbaAddress, User2.address)
      );

      // Step 1: TBA account uses execute() to call setApprovalForAll() with 2 parameters
      // (operator is User 2’s address, approved is true) is successful
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to call setApprovalForAll() with 2 parameters",
        "(operator is User 2’s address, approved is true) is successful"
      );
      data = iface1155.encodeFunctionData("setApprovalForAll", [
        User2.address,
        true,
      ]);
      await tba.execute(bora1155.target, 0, data, 0);

      // Step 2: TBA account using execute() to call isApprovedForAll() with 2 parameters
      // (account is TBA’s address, operator is User 2’s address).
      this.mlog.log(
        "[TBA Account 1]",
        "uses execute() to call isApprovedForAll() with 2 parameters (account is TBA’s address, operator is User 2’s address)"
      );
      data = iface1155.encodeFunctionData("isApprovedForAll", [
        tbaAddress,
        User2.address,
      ]);

      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let isApproved = Util.decodeFunctionResult(
        ["bool"],
        result.toString()
      )[0];
      isApproved = Util.toBoolean(isApproved);

      expect(isApproved).to.be.equal(true);

      this.mlog.after(
        "[TBA Account 1]",
        "is approval for all to",
        "[User2]",
        isApproved
      );
    });

    it("Should get approval for all of TBA account successfully", async function () {
      this.mlog.before(
        "[User1]",
        "is approval for all to",
        "[TBA Account 1]",
        await bora1155.isApprovedForAll(User1.address, tbaAddress)
      );

      // Step 1: User 1 uses setApprovalForAll() with 2 parameters
      // (operator is TBA’s address, approved is true) is successful
      this.mlog.log(
        "[User 1]",
        "uses setApprovalForAll() with 2 parameters (operator is TBA’s address, approved is true) is successful"
      );
      await bora1155.connect(User1).setApprovalForAll(tbaAddress, true);

      // Step 2: User 1 uses isApprovedForAll() with 2 parameters (account is User 1’s address, operator is TBA’s address).
      this.mlog.log(
        "[User 1]",
        "uses isApprovedForAll() with 2 parameters (account is User 1’s address, operator is TBA’s address)"
      );
      expect(
        await bora1155
          .connect(User1)
          .isApprovedForAll(User1.address, tbaAddress)
      ).to.be.true;

      this.mlog.after(
        "[User1]",
        "is approval for all to",
        "[TBA Account 1]",
        await bora1155.isApprovedForAll(User1.address, tbaAddress)
      );
    });
  });
});
