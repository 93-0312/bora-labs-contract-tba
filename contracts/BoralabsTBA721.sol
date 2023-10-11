// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.3)

pragma solidity 0.8.19;

import "./common/BoralabsBase.sol";

// ide remix
// import "@openzeppelin/contracts@4.9.3/token/ERC721/extensions/ERC721Enumerable.sol";
// import "@openzeppelin/contracts@4.9.3/security/ReentrancyGuard.sol";

// yarn
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BoralabsTBA721 is BoralabsBase, ERC721Enumerable, ReentrancyGuard{
    // =========================================================================================== //
    // BORA LABS 용 변수
    // =========================================================================================== //
    // 발행가능 mintNum : mint 할 때마다 1씩 올라간다...
    uint256 public availableMintNum = 1;
    // 1회 mint 시 발급할 수량 : character : 3, item : 5
    // 3일 경우 metadata 는 tokenId 앞에 숫자가 1 이면 1, 2이면 2, 3이면 3, 4이면 1 이렇게 리턴한다.
    uint256 public oneTimeMintNum = 3;
    // 발행 번호대 oneTimeMintNum 이 3 이면 10000001, 20000001, 30000001 이렇게 민트된다.
    uint256 public mintBand = 10000000;

    // =========================================================================================== //
    // 721
    // =========================================================================================== //
    string public contractURI = "https://tokenmetadata.boraportal.com/contracts/2022999999/";
    string public baseURI_ = "https://tokenmetadata.boraportal.com/contracts/2022999999/tokens/";

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {
    }

    /**
    function setContractURI(string calldata uri) external onlyOwner {
        contractURI = uri;
    }

    function setBaseURI(string calldata uri) external onlyOwner {
        baseURI_ = uri;
    }
    **/

    // =========================================================================================== //
    // TRANSFER
    // =========================================================================================== //
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override (ERC721, IERC721)  {
        super.safeTransferFrom(from, to, tokenId);
    }

    // =========================================================================================== //
    // MINT
    // =========================================================================================== //
    function tbaMint(
        address to
    ) public {
        for ( uint256 i = 1; i <= oneTimeMintNum; ++i ){
            _safeMint(to, mintBand*i + availableMintNum );
        }
        unchecked { ++availableMintNum; }
    }

    // =========================================================================================== //
    // BURN
    // =========================================================================================== //
    function burn(
        uint256 tokenId
    ) external {
        _burn(tokenId);
    }

    // =========================================================================================== //
    // tokenURI
    // =========================================================================================== //
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(tokenId > 0, "invalid tokenId");
        uint256 number = tokenId;
        while (number >= 10) {
            number /= 10;
        }
        number %= oneTimeMintNum;
        return string(abi.encodePacked(baseURI_, Strings.toString(number)));
    }

    // =========================================================================================== //
    // My Token List
    // =========================================================================================== //
    function tokensOf(address owner_) external view returns (uint256[] memory tokenIds){
        uint256 balance = balanceOf(owner_);

        uint256[] memory list = new uint256[](balance);

        for (uint256 i = 0; i < balance; ++i) {
            list[i] = tokenOfOwnerByIndex(owner_, i);
        }
        return list;
    }

}
