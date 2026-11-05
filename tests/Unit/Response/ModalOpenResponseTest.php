<?php

namespace Dyg81\ModalBundle\Tests\Unit\Response;

use Dyg81\ModalBundle\Response\ModalOpenResponse;
use PHPUnit\Framework\TestCase;

class ModalOpenResponseTest extends TestCase
{
    public function testConstructorEncodesModalAndDefaultId()
    {
        $response = new ModalOpenResponse('<div class="modal"></div>');

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['modal' => '<div class="modal"></div>', 'modalId' => null], json_decode($response->getContent(), true));
    }

    public function testConstructorAcceptsCustomModalIdStatusAndHeaders()
    {
        $response = new ModalOpenResponse('<div id="custom-modal"></div>', 'custom-modal', 201, ['X-Test' => 'yes']);

        $this->assertSame(201, $response->getStatusCode());
        $this->assertSame('yes', $response->headers->get('X-Test'));
        $this->assertStringContainsString('"modalId":"custom-modal"', $response->getContent());
    }

    public function testCreateBuildsResponseFromProtocolArray()
    {
        $response = ModalOpenResponse::create(['modal' => '<p>hello</p>', 'modalId' => 'msg']);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['modal' => '<p>hello</p>', 'modalId' => 'msg'], json_decode($response->getContent(), true));
    }

    public function testFromJsonStringParsesValidPayload()
    {
        $response = ModalOpenResponse::fromJsonString('{"modal":"<b>ok<\/b>","modalId":"alert"}', 202);

        $this->assertSame(202, $response->getStatusCode());
        $this->assertSame(['modal' => '<b>ok</b>', 'modalId' => 'alert'], json_decode($response->getContent(), true));
    }

    public function testSetDataRejectsMissingModal()
    {
        $this->expectException(\InvalidArgumentException::class);

        $response = new ModalOpenResponse('<div></div>');
        $response->setData(['modalId' => 'x']);
    }

    public function testSetDataRejectsInvalidModalIdType()
    {
        $this->expectException(\InvalidArgumentException::class);

        $response = new ModalOpenResponse('<div></div>');
        $response->setData(['modal' => '<div></div>', 'modalId' => 123]);
    }

    public function testCreateRejectsInvalidProtocol()
    {
        $this->expectException(\InvalidArgumentException::class);

        ModalOpenResponse::create(['modalId' => 'x']);
    }

    public function testFromJsonStringRejectsInvalidJson()
    {
        $this->expectException(\InvalidArgumentException::class);

        ModalOpenResponse::fromJsonString('not json');
    }
}
