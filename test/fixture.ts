import { ethers } from "hardhat";

export async function deployBora20() {
  const [owner20] = await ethers.getSigners();
  const bora20 = await ethers.deployContract(
    "BoralabsTBA20",
    ["BORA", "BORA"],
    owner20
  );
  return { bora20, owner20 };
}

export async function deployBora721() {
  const [owner721] = await ethers.getSigners();
  const bora721 = await ethers.deployContract(
    "BoralabsTBA721",
    ["BORA", "BORA"],
    owner721
  );
  return { bora721, owner721 };
}

export async function deployBora1155() {
  const [owner1155] = await ethers.getSigners();
  const bora1155 = await ethers.deployContract(
    "BoralabsTBA1155",
    [],
    owner1155
  );
  return { bora1155, owner1155 };
}

export async function deployBora6551Account() {
  const [ownerAccount] = await ethers.getSigners();
  const bora6551Account = await ethers.deployContract(
    "BoralabsTBA6551Account",
    [],
    ownerAccount
  );
  return { bora6551Account, ownerAccount };
}

export async function deployBora6551Registry() {
  const [ownerRegister] = await ethers.getSigners();
  const bora6551Registry = await ethers.deployContract(
    "BoralabsTBA6551Registry",
    [],
    ownerRegister
  );
  return { bora6551Registry, ownerRegister };
}
