// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.3)

pragma solidity 0.8.19;

import "./common/BoralabsBase.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Boralabs721 is BoralabsBase, ERC721, ReentrancyGuard{
    // 발행가능 mintNum
    uint256 public availableMintNum = 1;
    // 1회 mint 시 발급할 수량 : character : 3, item : 5
    uint256 public oneTimeMintNum = 3;
    // 발행 번호대
    uint256 public mintBand = 10000000;
    string public contractURI = ""; // Contract URI for Contract Information
    string public baseURI_ = ""; // Contract URI for Contract Information

    constructor(
        string memory baseURI__,
        string memory contractURI_,
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {
        baseURI_ = baseURI__;
        contractURI = contractURI_;
    }

    // =========================================================================================== //
    // TRANSFER
    // =========================================================================================== //
    function transferFrom(address from, address to, uint256 tokenId) public override {
        super.safeTransferFrom(from, to, tokenId);
    }

    // =========================================================================================== //
    // MINT
    // =========================================================================================== //
    function boralabsMint(address to) public onlyOwner {
        for ( uint256 i = 1; i <= oneTimeMintNum; ++i ){
            _safeMint(to, mintBand*i + availableMintNum );
        }
        unchecked { ++availableMintNum; }
    }

    // =========================================================================================== //
    // BuRN
    // =========================================================================================== //
    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        uint256 _tokenURI = tokenId / mintBand;
        return string(abi.encodePacked(baseURI_, _tokenURI));
    }

}
