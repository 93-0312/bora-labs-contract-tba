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
} from "./fixture";
import mlog from "./mlog";
import { BigNumberish, Interface } from "ethers";

describe("BoralabsTBA6551: Unit test", function () {
  mlog.injectLogger(this);

  let bora721: BoralabsTBA721;
  let bora1155: BoralabsTBA1155;
  let bora6551Account: BoralabsTBA6551Account;
  let bora6551Registry: BoralabsTBA6551Registry;

  let tbaAddress: string;
  let tba: BoralabsTBA6551Account;
  let tbaAddress2: string;

  let owner721: HardhatEthersSigner;
  let owner1155: HardhatEthersSigner;
  let ownerAccount: HardhatEthersSigner;
  let ownerRegistry: HardhatEthersSigner;

  let User1: HardhatEthersSigner;
  let User2: HardhatEthersSigner;
  let User3: HardhatEthersSigner;

  let data: string;

  const iface1155 = new Interface([
    "function safeTransferFrom(address from, address to, uint256 tokenId, uint256 amount, bytes data)",
    "function safeBatchTransferFrom( address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data )",
  ]);

  const amount = 10;
  const emptyData = "0x";

  beforeEach(async function () {
    [User1, User2, User3] = await ethers.getSigners();

    // deploy bora721
    ({ bora721, owner721 } = await loadFixture(deployBora721));

    // deploy bora1155
    ({ bora1155, owner1155 } = await loadFixture(deployBora1155));

    // deploy bora 6551 account
    ({ bora6551Account, ownerAccount } = await loadFixture(
      deployBora6551Account
    ));

    // deploy bora 6551 registry
    ({ bora6551Registry, ownerRegistry } = await loadFixture(
      deployBora6551Registry
    ));

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
      await expect(await bora1155.balanceOf(User2.address, 10000001)).to.equal(
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
      await expect(await bora1155.balanceOf(tbaAddress2, 50000001)).to.equal(
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
      await expect(await bora1155.balanceOf(User2.address, 10000001)).to.equal(
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
      await expect(await bora1155.balanceOf(User2.address, 10000001)).to.equal(
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
});
